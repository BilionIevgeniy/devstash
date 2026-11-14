"use client";
import { useTranslations } from "next-intl";

import dynamic from "next/dynamic";
import {
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import { flushSync } from "react-dom";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorHeader } from "@/features/editor/_internal/components/EditorHeader";
import type { EditorHandle } from "@/features/editor/types";
import { cn } from "@/lib/utils";

const FRAME_CLASS = "overflow-hidden rounded-md border bg-card";

// The create dialog sits in the top bar of every page; loaded on its own, the
// Markdown parser (~60 KB gzip) is fetched only when a preview first renders.
const MarkdownPreview = dynamic(
  () =>
    import("@/features/editor/components/MarkdownPreview").then(
      (mod) => mod.MarkdownPreview,
    ),
  { loading: () => <Skeleton className="h-16 w-full" /> },
);

interface MarkdownEditorProps {
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** The id of the textarea, so the field label focuses it. */
  id?: string;
  ariaLabel?: string;
  /** Read view only: controls after the "markdown" label. */
  headerActions?: ReactNode;
  /** Read view only: shown in place of the preview, such as an AI rewrite. */
  view?: ReactNode;
  /** Read view only: what Copy takes while `view` shows other text. */
  copyValue?: string;
  copyLabel?: string;
  /** Focuses the textarea, from the Preview tab too. Does nothing when read-only. */
  ref?: Ref<EditorHandle>;
}

export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  ariaLabel,
  headerActions,
  view,
  copyValue,
  copyLabel,
  ref,
}: MarkdownEditorProps) {
  const t = useTranslations("editor");
  const [tab, setTab] = useState("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // The Write panel is hidden while Preview is open, and a hidden textarea
  // cannot take the focus. The tab is switched and committed first, so the
  // focus lands on a visible one. Called from event handlers only.
  useImperativeHandle(
    ref,
    () => ({
      focus() {
        if (!textareaRef.current) return;
        flushSync(() => setTab("write"));
        textareaRef.current.focus();
      },
    }),
    [],
  );

  if (readOnly) {
    return (
      <ReadOnlyMarkdown
        value={value}
        headerActions={headerActions}
        view={view}
        copyValue={copyValue}
        copyLabel={copyLabel}
      />
    );
  }

  return (
    <Tabs
      value={tab}
      onValueChange={setTab}
      className={cn(
        FRAME_CLASS,
        "gap-0 transition-[color,box-shadow] has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/50",
      )}
    >
      <EditorHeader value={value} copyLabel={t("copyContent")}>
        <TabsList variant="line" className="ml-auto h-7">
          <TabsTrigger value="write" className="px-2 text-xs">
            {t("write")}
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2 text-xs">
            {t("preview")}
          </TabsTrigger>
        </TabsList>
      </EditorHeader>
      {/* Kept mounted while Preview is open, so the textarea keeps its undo
          history; Radix does not hide a force-mounted panel by itself. */}
      <TabsContent
        value="write"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <textarea
          ref={textareaRef}
          id={id}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          aria-label={ariaLabel ?? t("content")}
          className="block field-sizing-content max-h-100 min-h-40 w-full resize-none bg-transparent p-4 font-mono text-xs outline-none"
        />
      </TabsContent>
      <TabsContent value="preview">
        <PreviewPane value={value} />
      </TabsContent>
    </Tabs>
  );
}

type ReadOnlyMarkdownProps = Pick<
  MarkdownEditorProps,
  "value" | "headerActions" | "view" | "copyValue" | "copyLabel"
>;

// The read view: the preview, or the caller's view in its place, scrolling
// at the same height as CodeEditor's view.
function ReadOnlyMarkdown({
  value,
  headerActions,
  view,
  copyValue,
  copyLabel,
}: ReadOnlyMarkdownProps) {
  const t = useTranslations("editor");
  return (
    <div className={FRAME_CLASS}>
      <EditorHeader
        value={copyValue ?? value}
        copyLabel={copyLabel ?? t("copyContent")}
      >
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          markdown
        </span>
        {headerActions}
      </EditorHeader>
      {view ? (
        <div className="max-h-100 overflow-y-auto">{view}</div>
      ) : (
        <PreviewPane value={value} />
      )}
    </div>
  );
}

function PreviewPane({ value }: { value: string }) {
  const t = useTranslations("editor");
  return (
    <div className="max-h-100 overflow-y-auto p-4">
      {value.trim() === "" ? (
        <p className="text-sm text-muted-foreground">{t("nothingToPreview")}</p>
      ) : (
        <MarkdownPreview value={value} images="show" />
      )}
    </div>
  );
}
