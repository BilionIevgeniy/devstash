"use client";

import { useState } from "react";
import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLAIN_TEXT_LANGUAGE,
  editorLanguage,
} from "@/features/editor/_internal/domain/code-language";

const THEME = "devstash-dark";
const MAX_HEIGHT = 400;
const MIN_EDIT_HEIGHT = 160;
const MIN_READ_HEIGHT = 40;
const COPIED_RESET_MS = 2000;
const COPIED_MESSAGE = "Copied to clipboard";
const COPY_FAILED_MESSAGE = "Couldn't copy to the clipboard";

// Monaco takes hex colors, not CSS variables: these follow the dark tokens in
// globals.css (--card, --muted, --muted-foreground, --border).
const defineTheme: BeforeMount = (monaco) => {
  monaco.editor.defineTheme(THEME, {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#171717",
      "editor.lineHighlightBackground": "#262626",
      "editor.lineHighlightBorder": "#00000000",
      "editorLineNumber.foreground": "#525252",
      "editorLineNumber.activeForeground": "#a3a3a3",
      "editorGutter.background": "#171717",
      "scrollbar.shadow": "#00000000",
      "scrollbarSlider.background": "#ffffff1a",
      "scrollbarSlider.hoverBackground": "#ffffff33",
      "scrollbarSlider.activeBackground": "#ffffff4d",
    },
  });
};

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
  const [height, setHeight] = useState(minHeight);
  const languageId = editorLanguage(language);
  const languageLabel = language?.trim() || PLAIN_TEXT_LANGUAGE;

  // The editor grows with its content up to MAX_HEIGHT, then scrolls.
  const handleMount: OnMount = (editor) => {
    const fit = (contentHeight: number) =>
      setHeight(Math.min(Math.max(contentHeight, minHeight), MAX_HEIGHT));
    fit(editor.getContentHeight());
    editor.onDidContentSizeChange((event) => fit(event.contentHeight));
  };

  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5">
        <WindowDots />
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {languageLabel}
        </span>
        <CopyButton value={value} />
      </div>
      <Editor
        value={value}
        language={languageId}
        theme={THEME}
        height={height}
        beforeMount={defineTheme}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<Skeleton className="h-full w-full rounded-none" />}
        options={{
          ariaLabel,
          readOnly,
          domReadOnly: readOnly,
          renderLineHighlight: readOnly ? "none" : "line",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          // Suggestions and hovers are not clipped by the rounded frame
          fixedOverflowWidgets: true,
          automaticLayout: true,
          fontSize: 13,
          lineNumbersMinChars: 3,
          folding: false,
          glyphMargin: false,
          padding: { top: 12, bottom: 12 },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </div>
  );
}

function WindowDots() {
  return (
    <div className="flex gap-1.5" aria-hidden>
      <span className="size-3 rounded-full bg-[#ff5f57]" />
      <span className="size-3 rounded-full bg-[#febc2e]" />
      <span className="size-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setIsCopied(true);
      toast.success(COPIED_MESSAGE);
      setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
    } catch {
      toast.error(COPY_FAILED_MESSAGE);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-7"
      aria-label="Copy code"
      onClick={handleCopy}
    >
      {isCopied ? <Check /> : <Copy />}
    </Button>
  );
}
