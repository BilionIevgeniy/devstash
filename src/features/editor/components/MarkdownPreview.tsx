import { useTranslations } from "next-intl";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

// remark-breaks keeps single newlines: notes and prompts were plain text
// before, and their line breaks must not collapse into one paragraph.
const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

// Raw HTML stays off and urlTransform keeps its default, which strips
// javascript: and other unsafe URLs before href reaches this override.
const LINK: Components["a"] = ({ href, title, children }) => (
  <a href={href} title={title} target="_blank" rel="noopener noreferrer">
    {children}
  </a>
);

// The checkbox of a task list: read-only, so its state is its whole meaning.
function TaskCheckbox({ checked }: { checked: boolean }) {
  const t = useTranslations("editor");
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled
      readOnly
      aria-label={t(checked ? "taskDone" : "taskOpen")}
    />
  );
}

// No image loads, its alt text stands in. An image URL sends data out the
// moment it renders, without a click, so the Content-Security-Policy allows
// images from this app, R2 and GitHub avatars only (ADR 0036): an image of
// another host would show as broken. That holds for an AI answer and for the
// user's own note alike.
const COMPONENTS: Components = {
  a: LINK,
  input: ({ checked }) => <TaskCheckbox checked={checked ?? false} />,
  // A long line scrolls sideways, so the keyboard has to reach it.
  pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
};

interface MarkdownPreviewProps {
  value: string;
}

export function MarkdownPreview({ value }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {value}
      </ReactMarkdown>
    </div>
  );
}
