"use client";
import { useTranslations } from "next-intl";

import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import {
  useDialogControl,
  type DialogControl,
} from "@/components/common/hooks/use-dialog-control";
import { ListLoadError } from "@/components/common/lists/ListLoadError";
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
import type { CreateItemForm as CreateItemFormComponent } from "@/features/items/_internal/components/form/CreateItemForm";
import { CreateItemFormSkeleton } from "@/features/items/_internal/components/form/CreateItemFormSkeleton";
import { typeLabel } from "@/features/item-types/domain/item-type";
import { canCreateOfType } from "@/features/items/domain/item-fields";

const DEFAULT_TYPE = "snippet";
const NO_CUSTOM_TYPES: readonly string[] = [];
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
  formPromise ??=
    import("@/features/items/_internal/components/form/CreateItemForm").then(
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
  /** The type chosen when the dialog opens (a system type's name or a custom
   * type's); also names the button. */
  defaultType?: string;
  /** The user's custom types, from getCustomTypeNames on the server. */
  customTypeNames?: readonly string[];
  /** From getEntitlements on the server; the server checks again on create. */
  isPro: boolean;
  /** Opened from elsewhere: no button, and the focus goes back through this. */
  controlled?: DialogControl;
}

export function CreateItemDialog({
  defaultType,
  customTypeNames = NO_CUSTOM_TYPES,
  isPro,
  controlled,
}: CreateItemDialogProps) {
  const typeName = useTranslations("itemTypes");
  const t = useTranslations("items");
  const {
    isOpen,
    isPending: isCreating,
    run,
    close,
    handleOpenChange,
    handleCloseAutoFocus,
  } = useDialogControl(() => toast.success(t("toasts.created")), controlled);
  const { Form, hasFailed, preload, retry, clearFailure } =
    useCreateItemForm(isOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const initialType = defaultType ?? DEFAULT_TYPE;
  const label = defaultType
    ? t("create.newType", { type: typeLabel(typeName, defaultType, "one") })
    : t("create.newItem");
  // A type page of a Pro type keeps its button for a Free user, disabled, and
  // so does the page of a custom type a former Pro user keeps (ADR 0032).
  const isLocked =
    defaultType !== undefined && !canCreateOfType(defaultType, isPro);

  // A closed dialog forgets a failed load, so the next open tries again.
  function handleDialogOpenChange(open: boolean) {
    if (!open && !isCreating) clearFailure();
    handleOpenChange(open);
  }

  // With the form still loading, the first focusable element would be the X;
  // the dialog holds the focus until the form hands it to its first field.
  function handleOpenAutoFocus(event: Event) {
    if (Form) return;
    event.preventDefault();
    contentRef.current?.focus();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
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
            customTypeNames={customTypeNames}
            isPro={isPro}
            isCreating={isCreating}
            run={run}
            onCreated={close}
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
