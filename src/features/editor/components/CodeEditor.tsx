"use client";
import { useTranslations } from "next-intl";

import { Suspense, useState, type ReactNode, type Ref } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EditorHeader } from "@/features/editor/_internal/components/EditorHeader";
import { MonacoEditor } from "@/features/editor/_internal/components/MonacoEditor";
import {
  editorLanguage,
  languageLabel,
} from "@/features/editor/domain/code-language";
import type { EditorHandle } from "@/features/editor/types";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 400;
const MIN_EDIT_HEIGHT = 160;
const MIN_READ_HEIGHT = 40;
// The minimum heights as classes: the editor starts at its minimum.
const EDIT_FALLBACK_HEIGHT = "h-40";
const READ_FALLBACK_HEIGHT = "h-10";

interface CodeEditorProps {
  value: string;
  language: string | null;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  ariaLabel?: string;
  /** Controls of the read view, after the language label. */
  headerActions?: ReactNode;
  /** Shown in place of the code, such as an explanation of it. */
  view?: ReactNode;
  /** Focuses the editor. Does nothing until Monaco has loaded. */
  ref?: Ref<EditorHandle>;
}

export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  ariaLabel,
  headerActions,
  view,
  ref,
}: CodeEditorProps) {
  const t = useTranslations("editor");
  const minHeight = readOnly ? MIN_READ_HEIGHT : MIN_EDIT_HEIGHT;
  const fallbackHeight = readOnly ? READ_FALLBACK_HEIGHT : EDIT_FALLBACK_HEIGHT;
  const [height, setHeight] = useState(minHeight);

  // The editor grows with its content up to MAX_HEIGHT, then scrolls.
  const fit = (contentHeight: number) =>
    setHeight(Math.min(Math.max(contentHeight, minHeight), MAX_HEIGHT));

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <EditorHeader value={value} copyLabel={t("copyCode")}>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {languageLabel(language)}
        </span>
        {headerActions}
      </EditorHeader>
      {/* While a view is shown, Monaco stays mounted so switching back does
          not load it again, and keeps its width: hidden at width 0 it would
          measure every line as wrapped and come back at the wrong height. */}
      <div className="relative">
        {view && <div className="max-h-100 overflow-y-auto">{view}</div>}
        <div className={cn(view && "invisible absolute inset-x-0 top-0")}>
          <Suspense
            fallback={
              <Skeleton className={`${fallbackHeight} w-full rounded-none`} />
            }
          >
            <MonacoEditor
              value={value}
              language={editorLanguage(language)}
              height={height}
              readOnly={readOnly}
              ariaLabel={ariaLabel ?? t("code")}
              onChange={onChange}
              onContentHeight={fit}
              ref={ref}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
