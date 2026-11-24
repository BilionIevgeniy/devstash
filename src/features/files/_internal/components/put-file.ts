import "client-only";

interface PutFileOptions {
  url: string;
  file: File;
  /** Must equal the signed Content-Type, or R2 rejects the signature. */
  contentType: string;
  onProgress: (progress: number) => void;
  onDone: (isOk: boolean) => void;
}

// A connection that moves no byte for this long is dead. Not a limit on the
// whole upload, which may be slow.
const STALL_MS = 60_000;

// Sends the file to R2 through the signed PUT, with the browser's own upload
// progress in percent. An abort reports nothing: the caller that aborts has
// already moved on (reset, a new upload or unmount). `timeout` counts from
// send() and may be moved while the request runs, so every sign of progress
// moves it on; the last one also bounds the wait for R2's answer.
export function startPut({
  url,
  file,
  contentType,
  onProgress,
  onDone,
}: PutFileOptions): XMLHttpRequest {
  const request = new XMLHttpRequest();
  let sentAt = 0;
  request.upload.onprogress = (event) => {
    request.timeout = Math.round(performance.now() - sentAt) + STALL_MS;
    if (!event.lengthComputable) return;
    onProgress(Math.round((event.loaded / event.total) * 100));
  };
  request.onload = () => onDone(request.status >= 200 && request.status < 300);
  request.onerror = () => onDone(false);
  request.ontimeout = () => onDone(false);
  request.open("PUT", url);
  request.setRequestHeader("Content-Type", contentType);
  request.timeout = STALL_MS;
  sentAt = performance.now();
  request.send(file);
  return request;
}
