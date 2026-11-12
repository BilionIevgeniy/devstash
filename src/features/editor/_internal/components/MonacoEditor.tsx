import Editor, {
  loader,
  type BeforeMount,
  type OnMount,
} from "@monaco-editor/react";
import { useImperativeHandle, useRef, type Ref } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EditorFallback } from "@/features/editor/_internal/components/EditorFallback";
import { useMonacoLoadFailed } from "@/features/editor/_internal/components/hooks/use-monaco-load-failed";
import {
  MONACO_THEME_NAMES,
  MONACO_THEMES,
} from "@/features/editor/_internal/domain/editor-themes";
import { EDITOR_THEMES } from "@/features/editor/_internal/domain/preferences";
import { useEditorPreferences } from "@/features/editor/components/EditorPreferencesProvider";
import type { EditorHandle } from "@/features/editor/types";

// At the top of the module: the loader reads this once, when the first Editor
// mounts, and this is the only file that renders one. Without it Monaco comes
// from a CDN.
loader.config({ paths: { vs: process.env.NEXT_PUBLIC_MONACO_VS_PATH } });

const defineThemes: BeforeMount = (monaco) => {
  for (const theme of EDITOR_THEMES) {
    monaco.editor.defineTheme(MONACO_THEME_NAMES[theme], MONACO_THEMES[theme]);
  }
};

interface MonacoEditorProps {
  value: string;
  language: string;
  height: number;
  readOnly: boolean;
  ariaLabel: string;
  onChange?: (value: string) => void;
  onContentHeight: (contentHeight: number) => void;
  ref?: Ref<EditorHandle>;
}

export function MonacoEditor({
  value,
  language,
  height,
  readOnly,
  ariaLabel,
  onChange,
  onContentHeight,
  ref,
}: MonacoEditorProps) {
  const { preferences } = useEditorPreferences();
  const hasLoadFailed = useMonacoLoadFailed();
  const monacoRef = useRef<Parameters<OnMount>[0] | null>(null);
  const fallbackRef = useRef<HTMLTextAreaElement | null>(null);

  // The fallback textarea wins when it is shown: Monaco's instance is gone by
  // then. Before Monaco has mounted there is nothing to focus yet.
  useImperativeHandle(
    ref,
    () => ({
      focus() {
        (fallbackRef.current ?? monacoRef.current)?.focus();
      },
    }),
    [],
  );

  const handleMount: OnMount = (editor) => {
    monacoRef.current = editor;
    onContentHeight(editor.getContentHeight());
    editor.onDidContentSizeChange((event) =>
      onContentHeight(event.contentHeight),
    );
  };

  if (hasLoadFailed) {
    return (
      <EditorFallback
        value={value}
        readOnly={readOnly}
        ariaLabel={ariaLabel}
        onChange={onChange}
        textareaRef={fallbackRef}
      />
    );
  }

  return (
    <Editor
      value={value}
      language={language}
      theme={MONACO_THEME_NAMES[preferences.theme]}
      height={height}
      beforeMount={defineThemes}
      onMount={handleMount}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<Skeleton className="size-full rounded-none" />}
      options={{
        ariaLabel,
        readOnly,
        domReadOnly: readOnly,
        renderLineHighlight: readOnly ? "none" : "line",
        minimap: { enabled: preferences.minimap },
        wordWrap: preferences.wordWrap ? "on" : "off",
        scrollBeyondLastLine: false,
        // Suggestions and hovers are not clipped by the rounded frame
        fixedOverflowWidgets: true,
        automaticLayout: true,
        fontSize: preferences.fontSize,
        // Detection would replace the chosen tab size with the content's own
        tabSize: preferences.tabSize,
        detectIndentation: false,
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
  );
}
