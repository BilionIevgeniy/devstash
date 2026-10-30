"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { FileUp, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requestUpload } from "@/features/files/actions/upload";
import {
  acceptedExtensions,
  checkDeclaredFile,
  formatFileSize,
  maxFileSize,
  type FileKind,
} from "@/features/files/domain/file-rules";
import type { UploadedFile } from "@/features/files/types";
import { cn } from "@/lib/utils";

const UPLOAD_FAILED_MESSAGE =
  "The upload failed. Check your connection and try again.";

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; file: File; progress: number }
  | { status: "failed"; file: File | null; error: string }
  | { status: "done"; file: File };

interface FileUploadProps {
  kind: FileKind;
  /** Called with the finished upload, or null when it is removed or restarted. */
  onChange: (upload: UploadedFile | null) => void;
  disabled?: boolean;
}

// The browser sends the file straight to R2 through a signed PUT, so the
// progress is the browser's own. Unmounting aborts a running upload, so a
// closed dialog or a switched type never keeps sending.
export function FileUpload({ kind, onChange, disabled }: FileUploadProps) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<XMLHttpRequest | null>(null);
  // Bumped by every new upload, reset and unmount, so an attempt still
  // waiting for its signed URL does not start the PUT afterwards.
  const attemptRef = useRef(0);
  const label = kind === "image" ? "image" : "file";

  useEffect(
    () => () => {
      attemptRef.current += 1;
      requestRef.current?.abort();
    },
    [],
  );

  async function upload(file: File) {
    requestRef.current?.abort();
    const attempt = ++attemptRef.current;
    onChange(null);

    const check = checkDeclaredFile(kind, file.name, file.size);
    if ("error" in check) {
      setState({ status: "failed", file: null, error: check.error });
      return;
    }

    setState({ status: "uploading", file, progress: 0 });
    const signed = await requestUpload({
      kind,
      fileName: file.name,
      size: file.size,
    });
    if (attempt !== attemptRef.current) return;
    if (!signed.success || !signed.data) {
      setState({
        status: "failed",
        file,
        error: signed.error ?? UPLOAD_FAILED_MESSAGE,
      });
      return;
    }

    const { uploadUrl, key, contentType } = signed.data;
    const request = new XMLHttpRequest();
    requestRef.current = request;
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const progress = Math.round((event.loaded / event.total) * 100);
      setState({ status: "uploading", file, progress });
    };
    request.onload = () => {
      requestRef.current = null;
      if (request.status >= 200 && request.status < 300) {
        setState({ status: "done", file });
        onChange({ key, fileName: file.name });
      } else {
        setState({ status: "failed", file, error: UPLOAD_FAILED_MESSAGE });
      }
    };
    request.onerror = () => {
      requestRef.current = null;
      setState({ status: "failed", file, error: UPLOAD_FAILED_MESSAGE });
    };
    request.open("PUT", uploadUrl);
    // Must equal the signed Content-Type, or R2 rejects the signature.
    request.setRequestHeader("Content-Type", contentType);
    request.send(file);
  }

  function reset() {
    attemptRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setState({ status: "idle" });
    onChange(null);
  }

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) void upload(file);
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={acceptedExtensions(kind)}
      className="hidden"
      onChange={(event) => {
        const file = event.target.files?.[0];
        // Cleared, so picking the same file again still fires a change.
        event.target.value = "";
        if (file) void upload(file);
      }}
    />
  );

  if (state.status === "uploading" || state.status === "done") {
    const isUploading = state.status === "uploading";
    return (
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center gap-3">
          <FileUp className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{state.file.name}</p>
            <p className="text-xs text-muted-foreground">
              {isUploading
                ? `Uploading… ${state.progress}%`
                : formatFileSize(state.file.size)}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={reset}
            disabled={disabled}
            aria-label={isUploading ? "Cancel upload" : `Remove ${label}`}
          >
            <X />
          </Button>
        </div>
        {isUploading && <Progress value={state.progress} />}
      </div>
    );
  }

  return (
    <div className="space-y-2">
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
      {state.status === "failed" && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span role="alert" className="flex-1">
            {state.error}
          </span>
          {state.file && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => state.file && void upload(state.file)}
            >
              <RotateCcw />
              Retry
            </Button>
          )}
        </div>
      )}
      {input}
    </div>
  );
}
