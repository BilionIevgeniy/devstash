/**
 * What an editor hands to the component that holds it through `ref`: the one
 * thing a form needs from outside. It does nothing while the editor is still
 * loading, and in the read-only Markdown view.
 */
export interface EditorHandle {
  focus: () => void;
}
