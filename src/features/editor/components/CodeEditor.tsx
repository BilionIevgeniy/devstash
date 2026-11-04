"use client";

import { Suspense, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EditorHeader } from "@/features/editor/_internal/components/EditorHeader";
import { MonacoEditor } from "@/features/editor/_internal/components/MonacoEditor";
import {
  PLAIN_TEXT_LANGUAGE,
  editorLanguage,
} from "@/features/editor/_internal/domain/code-language";

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
}

export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  ariaLabel = "Code",
}: CodeEditorProps) {
  const minHeight = readOnly ? MIN_READ_HEIGHT : MIN_EDIT_HEIGHT;
  const fallbackHeight = readOnly ? READ_FALLBACK_HEIGHT : EDIT_FALLBACK_HEIGHT;
  const [height, setHeight] = useState(minHeight);
  const languageLabel = language?.trim() || PLAIN_TEXT_LANGUAGE;

  // The editor grows with its content up to MAX_HEIGHT, then scrolls.
  const fit = (contentHeight: number) =>
    setHeight(Math.min(Math.max(contentHeight, minHeight), MAX_HEIGHT));

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <EditorHeader value={value} copyLabel="Copy code">
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {languageLabel}
        </span>
      </EditorHeader>
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
          ariaLabel={ariaLabel}
          onChange={onChange}
          onContentHeight={fit}
        />
      </Suspense>
    </div>
  );
}
