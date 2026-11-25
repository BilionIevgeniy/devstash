import { Sparkles } from "lucide-react";

type TokenKind = "key" | "fn" | "type";
type Token = string | [TokenKind, string];

// Darker on a light card (ADR 0039), as stored on a dark one.
const TOKEN_CLASSES: Record<TokenKind, string> = {
  key: "text-[#7c3aed] dark:text-[#a78bfa]",
  fn: "text-[#2563eb] dark:text-[#60a5fa]",
  type: "text-[#047857] dark:text-[#34d399]",
};

const T: Token = ["type", "T"];
const CODE: Token[][] = [
  [
    ["key", "export function"],
    " ",
    ["fn", "useDebounce"],
    "<",
    T,
    ">(value: ",
    T,
    ", delay: ",
    ["type", "number"],
    "): ",
    T,
    " {",
  ],
  [
    "  ",
    ["key", "const"],
    " [debounced, setDebounced] = ",
    ["fn", "useState"],
    "(value);",
  ],
  [],
  ["  ", ["fn", "useEffect"], "(() => {"],
  [
    "    ",
    ["key", "const"],
    " timer = ",
    ["fn", "setTimeout"],
    "(() => ",
    ["fn", "setDebounced"],
    "(value), delay);",
  ],
  ["    ", ["key", "return"], " () => ", ["fn", "clearTimeout"], "(timer);"],
  ["  }, [value, delay]);"],
  [],
  ["  ", ["key", "return"], " debounced;"],
  ["}"],
];

const TAGS = ["react", "hooks", "debounce", "typescript", "performance"];

function CodeToken({ token }: { token: Token }) {
  if (typeof token === "string") return token;
  const [kind, text] = token;
  return <span className={TOKEN_CLASSES[kind]}>{text}</span>;
}

interface CodeMockupProps {
  codeLabel: string;
  tagsLabel: string;
}

export function CodeMockup({ codeLabel, tagsLabel }: CodeMockupProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[14px] border bg-card">
      <div className="flex h-10 items-center gap-3 border-b px-4">
        <span aria-hidden="true" className="flex gap-1.5">
          <i className="size-2.5 rounded-full bg-black/18 dark:bg-white/18" />
          <i className="size-2.5 rounded-full bg-black/18 dark:bg-white/18" />
          <i className="size-2.5 rounded-full bg-black/18 dark:bg-white/18" />
        </span>
        <span className="font-mono text-xs text-dim">use-debounce.ts</span>
      </div>
      <pre
        role="region"
        tabIndex={0}
        aria-label={codeLabel}
        className="overflow-x-auto px-4 py-5 font-mono text-[13px] leading-[1.7] max-sm:wrap-anywhere max-sm:whitespace-pre-wrap"
      >
        <code>
          {CODE.map((line, lineIndex) => (
            <span key={lineIndex}>
              {line.map((token, tokenIndex) => (
                <CodeToken key={tokenIndex} token={token} />
              ))}
              {lineIndex < CODE.length - 1 && "\n"}
            </span>
          ))}
        </code>
      </pre>
      <div className="border-t bg-raised p-4">
        <span className="flex items-center gap-2 font-mono text-[13px] font-medium text-brand">
          <Sparkles className="size-3.5" />
          {tagsLabel}
        </span>
        <ul className="mt-3 flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <li
              key={tag}
              className="rounded-md border px-2.5 py-0.5 font-mono text-xs text-muted-foreground"
            >
              {tag}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
