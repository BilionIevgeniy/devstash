"use client";
import { useTranslations } from "next-intl";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { useSubmitDialog } from "@/components/common/hooks/use-submit-dialog";
import { ListLoadError } from "@/components/common/ListLoadError";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ProBadge } from "@/features/billing/components/ProBadge";
import type { CreateItemForm as CreateItemFormComponent } from "@/features/items/_internal/components/CreateItemForm";
import { CreateItemFormSkeleton } from "@/features/items/_internal/components/CreateItemFormSkeleton";
import {
  canCreateType,
  type CreatableTypeName,
} from "@/features/items/domain/item-fields";

const DEFAULT_TYPE: CreatableTypeName = "snippet";
const IDLE_FALLBACK_MS = 1500;

type FormComponent = typeof CreateItemFormComponent;

// The form is its own chunk (docs/performance.md). One promise per page, so
// every dialog and every preload share it; a failed load forgets it, so Try
// again fetches anew. A plain import() rather than next/dynamic: lazy() would
// suspend on its first render even with the chunk already here, flashing the
// skeleton, and would throw a failed chunk to the page's error boundary.
let formPromise: Promise<FormComponent> | null = null;
let loadedForm: FormComponent | null = null;

function loadForm(): Promise<FormComponent> {
  formPromise ??= import(
    "@/features/items/_internal/components/CreateItemForm"
  ).then(
    (mod) => (loadedForm = mod.CreateItemForm),
    (error: unknown) => {
      formPromise = null;
      throw error;
    },
  );
  return formPromise;
}

function whenIdle(callback: () => void): () => void {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(callback, { timeout: IDLE_FALLBACK_MS });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(callback, IDLE_FALLBACK_MS);
  return () => clearTimeout(id);
}

// The form once it is here, and whether its load failed behind the open
// dialog. The page loads it once it is idle, a trigger about to be used
// (`preload`) or an open dialog sooner; a preload that fails says nothing.
// A failure counts only for the attempt it belongs to: a load that fails
// after its dialog closed would otherwise greet the next open as an error.
function useCreateItemForm(isOpen: boolean) {
  const [form, setForm] = useState<FormComponent | null>(() => loadedForm);
  const [hasFailed, setHasFailed] = useState(false);
  const attempt = useRef(0);

  function load(reportFailure: boolean) {
    const started = attempt.current;
    loadForm().then(
      (loaded) => setForm(() => loaded),
      () => {
        if (reportFailure && attempt.current === started) setHasFailed(true);
      },
    );
  }

  useEffect(() => {
    if (form) return;
    const show = (loaded: FormComponent) => setForm(() => loaded);
    if (isOpen) {
      const started = attempt.current;
      loadForm().then(show, () => {
        if (attempt.current === started) setHasFailed(true);
      });
      return () => {
        attempt.current += 1;
      };
    }
    return whenIdle(() => {
      loadForm().then(show, () => {});
    });
  }, [form, isOpen]);

  return {
    Form: form,
    hasFailed,
    preload: () => load(false),
    retry: () => {
      setHasFailed(false);
      load(true);
    },
    clearFailure: () => {
      attempt.current += 1;
      setHasFailed(false);
    },
  };
}

interface CreateItemDialogProps {
  /** The type chosen when the dialog opens; also names the button. */
  defaultType?: CreatableTypeName;
  /** From getEntitlements on the server; the server checks again on create. */
  isPro: boolean;
  /** Opened from elsewhere: no button, and the focus goes back through this. */
  controlled?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    returnFocus: () => void;
  };
}

export function CreateItemDialog({
  defaultType,
  isPro,
  controlled,
}: CreateItemDialogProps) {
  const typeName = useTranslations("itemTypes");
  const t = useTranslations("items");
  const [isOpenState, setIsOpenState] = useState(false);
  const isOpen = controlled?.open ?? isOpenState;
  const setIsOpen = controlled?.onOpenChange ?? setIsOpenState;
  const { isPending: isCreating, run, takeDone } = useSubmitDialog();
  const { Form, hasFailed, preload, retry, clearFailure } =
    useCreateItemForm(isOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialType = defaultType ?? DEFAULT_TYPE;
  const label = defaultType
    ? t("create.newType", { type: typeName(`${defaultType}.one`) })
    : t("create.newItem");
  // A type page of a Pro type keeps its button for a Free user, disabled.
  const isLocked =
    defaultType !== undefined && !canCreateType(defaultType, isPro);

  // Esc, the overlay and the X wait for the result: closing now would lose
  // the input on a failure and let the form be sent twice.
  // A closed dialog forgets a failed load, so the next open tries again.
  function handleOpenChange(open: boolean) {
    if (isCreating) return;
    if (!open) clearFailure();
    setIsOpen(open);
  }

  // With the form still loading, the first focusable element would be the X;
  // the dialog holds the focus until the form hands it to its first field.
  function handleOpenAutoFocus(event: Event) {
    if (Form) return;
    event.preventDefault();
    contentRef.current?.focus();
  }

  // Sonner is outside the transition, so a toast in the form would show
  // before the refreshed page closes the dialog. Radix calls this once the
  // dialog has closed, with or without an animation; focus still returns to
  // the trigger, or through `controlled`, which has none.
  function handleCloseAutoFocus(event: Event) {
    if (controlled) {
      event.preventDefault();
      controlled.returnFocus();
    }
    if (takeDone()) toast.success(t("toasts.created"));
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!controlled && (
        <CreateTrigger label={label} isLocked={isLocked} onIntent={preload} />
      )}
      <DialogContent
        ref={contentRef}
        className="max-h-[90vh] grid-cols-1 overflow-y-auto"
        onOpenAutoFocus={handleOpenAutoFocus}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>
        {/* Unmounted with the closed dialog, so every open starts empty and
            a running upload is aborted. */}
        {Form ? (
          <Form
            initialType={initialType}
            isPro={isPro}
            isCreating={isCreating}
            run={run}
            onCreated={() => setIsOpen(false)}
          />
        ) : hasFailed ? (
          <ListLoadError onRetry={retry} message={t("create.loadFailed")} />
        ) : (
          <CreateItemFormSkeleton typeName={initialType} />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CreateTriggerProps {
  label: string;
  isLocked: boolean;
  /** A pointer over the button or the focus on it: the click may follow. */
  onIntent: () => void;
}

function CreateTrigger({ label, isLocked, onIntent }: CreateTriggerProps) {
  return (
    <DialogTrigger asChild>
      <Button disabled={isLocked} onPointerEnter={onIntent} onFocus={onIntent}>
        <Plus />
        <span>{label}</span>
        {isLocked && <ProBadge />}
      </Button>
    </DialogTrigger>
  );
}
