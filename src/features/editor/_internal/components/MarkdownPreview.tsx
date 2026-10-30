import ReactMarkdown, { type Components } from "react-markdown";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";

// remark-breaks keeps single newlines: notes and prompts were plain text
// before, and their line breaks must not collapse into one paragraph.
const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

// Raw HTML stays off and urlTransform keeps its default, which strips
// javascript: and other unsafe URLs before href reaches this override.
const COMPONENTS: Components = {
  a: ({ href, title, children }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

export function MarkdownPreview({ value }: { value: string }) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {value}
      </ReactMarkdown>
    </div>
  );
}
