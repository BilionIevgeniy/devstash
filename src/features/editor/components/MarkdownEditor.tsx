"use client";

import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditorHeader } from "@/features/editor/_internal/components/EditorHeader";
import { cn } from "@/lib/utils";

const FRAME_CLASS = "overflow-hidden rounded-md border bg-card";
const COPY_LABEL = "Copy content";

// The create dialog sits in the top bar of every page; loaded on its own, the
// Markdown parser (~60 KB gzip) is fetched only when a preview first renders.
const MarkdownPreview = dynamic(
  () =>
    import("@/features/editor/_internal/components/MarkdownPreview").then(
      (mod) => mod.MarkdownPreview,
    ),
  { loading: () => <Skeleton className="h-16 w-full" /> },
);

interface MarkdownEditorProps {
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** The id of the textarea, so the field label focuses it. */
  id?: string;
  ariaLabel?: string;
}

export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  ariaLabel = "Content",
}: MarkdownEditorProps) {
  if (readOnly) {
    return (
      <div className={FRAME_CLASS}>
        <EditorHeader value={value} copyLabel={COPY_LABEL}>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            markdown
          </span>
        </EditorHeader>
        <PreviewPane value={value} />
      </div>
    );
  }

  return (
    <Tabs
      defaultValue="write"
      className={cn(
        FRAME_CLASS,
        "gap-0 transition-[color,box-shadow] has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-3 has-[textarea:focus-visible]:ring-ring/50",
      )}
    >
      <EditorHeader value={value} copyLabel={COPY_LABEL}>
        <TabsList variant="line" className="ml-auto h-7">
          <TabsTrigger value="write" className="px-2 text-xs">
            Write
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2 text-xs">
            Preview
          </TabsTrigger>
        </TabsList>
      </EditorHeader>
      {/* Kept mounted while Preview is open, so the textarea keeps its undo
          history; Radix does not hide a force-mounted panel by itself. */}
      <TabsContent
        value="write"
        forceMount
        className="data-[state=inactive]:hidden"
      >
        <textarea
          id={id}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          aria-label={ariaLabel}
          className="block field-sizing-content max-h-[400px] min-h-40 w-full resize-none bg-transparent p-4 font-mono text-xs outline-none"
        />
      </TabsContent>
      <TabsContent value="preview">
        <PreviewPane value={value} />
      </TabsContent>
    </Tabs>
  );
}

function PreviewPane({ value }: { value: string }) {
  return (
    <div className="max-h-[400px] overflow-y-auto p-4">
      {value.trim() === "" ? (
        <p className="text-sm text-muted-foreground">Nothing to preview</p>
      ) : (
        <MarkdownPreview value={value} />
      )}
    </div>
  );
}
