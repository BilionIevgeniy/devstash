"use client";

import { useRef, useState, type DragEvent } from "react";
import { FileUp } from "lucide-react";

import {
  acceptedExtensions,
  formatFileSize,
  maxFileSize,
  type FileKind,
} from "@/features/files/domain/file-rules";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  kind: FileKind;
  label: string;
  disabled?: boolean;
  onFile: (file: File) => void;
}

// A file dropped on the zone or picked with the hidden input; the zone is a
// button for the keyboard too.
export function DropZone({ kind, label, disabled, onFile }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) onFile(file);
  }

  return (
    <>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`Upload ${label}`}
        aria-disabled={disabled}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          openPicker();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-1 rounded-md border border-dashed px-4 py-6 text-center text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragging && "border-primary bg-accent",
          disabled && "cursor-not-allowed opacity-50",
        )}
      >
        <FileUp className="size-5 text-muted-foreground" />
        <span>Drop the {label} here or click to choose</span>
        <span className="text-xs text-muted-foreground">
          {acceptedExtensions(kind).replaceAll(",", ", ")} · up to{" "}
          {formatFileSize(maxFileSize(kind))}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptedExtensions(kind)}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared, so picking the same file again still fires a change.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}
