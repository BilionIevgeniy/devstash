import { useEffect, useRef, useState } from "react";

import { startPut } from "@/features/files/_internal/components/put-file";
import { requestUpload } from "@/features/files/actions/upload";
import {
  checkDeclaredFile,
  type FileKind,
} from "@/features/files/domain/file-rules";
import type { UploadedFile } from "@/features/files/types";

const UPLOAD_FAILED_MESSAGE =
  "The upload failed. Check your connection and try again.";

export type UploadState =
  | { status: "idle" }
  | { status: "uploading"; file: File; progress: number }
  | { status: "failed"; file: File | null; error: string }
  | { status: "done"; file: File };

// The upload of one file: checked, signed by the server, then sent by the
// browser straight to R2. Unmounting aborts a running upload, so a closed
// dialog or a switched type never keeps sending.
export function useFileUpload(
  kind: FileKind,
  onChange: (upload: UploadedFile | null) => void,
) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const requestRef = useRef<XMLHttpRequest | null>(null);
  // Bumped by every new upload, reset and unmount, so an attempt still
  // waiting for its signed URL does not start the PUT afterwards.
  const attemptRef = useRef(0);

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
      const error = signed.error ?? UPLOAD_FAILED_MESSAGE;
      setState({ status: "failed", file, error });
      return;
    }

    const { uploadUrl, key, contentType } = signed.data;
    requestRef.current = startPut({
      url: uploadUrl,
      file,
      contentType,
      onProgress: (progress) =>
        setState({ status: "uploading", file, progress }),
      onDone: (isOk) => {
        requestRef.current = null;
        if (!isOk) {
          setState({ status: "failed", file, error: UPLOAD_FAILED_MESSAGE });
          return;
        }
        setState({ status: "done", file });
        onChange({ key, fileName: file.name });
      },
    });
  }

  function reset() {
    attemptRef.current += 1;
    requestRef.current?.abort();
    requestRef.current = null;
    setState({ status: "idle" });
    onChange(null);
  }

  return { state, upload, reset };
}
