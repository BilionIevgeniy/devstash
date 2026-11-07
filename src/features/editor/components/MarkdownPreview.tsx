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

const SHOW_IMAGES: Components = { a: LINK };

// Text the user did not write (an AI answer) can carry an image whose URL
// sends data out the moment it renders, without a click: no image loads,
// its alt text stands in.
const DROP_IMAGES: Components = {
  a: LINK,
  img: ({ alt }) => (alt ? <span>{alt}</span> : null),
};

interface MarkdownPreviewProps {
  value: string;
  /** Required, so no caller of untrusted text shows images by default. */
  images: "show" | "drop";
}

export function MarkdownPreview({ value, images }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown
        remarkPlugins={REMARK_PLUGINS}
        components={images === "show" ? SHOW_IMAGES : DROP_IMAGES}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
