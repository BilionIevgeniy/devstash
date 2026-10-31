import "client-only";

interface PutFileOptions {
  url: string;
  file: File;
  /** Must equal the signed Content-Type, or R2 rejects the signature. */
  contentType: string;
  onProgress: (progress: number) => void;
  onDone: (isOk: boolean) => void;
}

// Sends the file to R2 through the signed PUT, with the browser's own upload
// progress in percent. An abort reports nothing: the caller that aborts has
// already moved on (reset, a new upload or unmount).
export function startPut({
  url,
  file,
  contentType,
  onProgress,
  onDone,
}: PutFileOptions): XMLHttpRequest {
  const request = new XMLHttpRequest();
  request.upload.onprogress = (event) => {
    if (!event.lengthComputable) return;
    onProgress(Math.round((event.loaded / event.total) * 100));
  };
  request.onload = () => onDone(request.status >= 200 && request.status < 300);
  request.onerror = () => onDone(false);
  request.open("PUT", url);
  request.setRequestHeader("Content-Type", contentType);
  request.send(file);
  return request;
}
