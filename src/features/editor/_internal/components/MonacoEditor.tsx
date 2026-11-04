import Editor, { type BeforeMount, type OnMount } from "@monaco-editor/react";

import { Skeleton } from "@/components/ui/skeleton";
import {
  MONACO_THEME_NAMES,
  MONACO_THEMES,
} from "@/features/editor/_internal/domain/editor-themes";
import { EDITOR_THEMES } from "@/features/editor/_internal/domain/preferences";
import { useEditorPreferences } from "@/features/editor/components/EditorPreferencesProvider";

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
}

export function MonacoEditor({
  value,
  language,
  height,
  readOnly,
  ariaLabel,
  onChange,
  onContentHeight,
}: MonacoEditorProps) {
  const { preferences } = useEditorPreferences();

  const handleMount: OnMount = (editor) => {
    onContentHeight(editor.getContentHeight());
    editor.onDidContentSizeChange((event) =>
      onContentHeight(event.contentHeight),
    );
  };

  return (
    <Editor
      value={value}
      language={language}
      theme={MONACO_THEME_NAMES[preferences.theme]}
      height={height}
      beforeMount={defineThemes}
      onMount={handleMount}
      onChange={(next) => onChange?.(next ?? "")}
      loading={<Skeleton className="h-full w-full rounded-none" />}
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
