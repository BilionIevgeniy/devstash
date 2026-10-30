export interface PresignedUpload {
  uploadUrl: string;
  key: string;
  /** The browser sends exactly this Content-Type, or R2 rejects the signature. */
  contentType: string;
}

/** A finished upload, as the form hands it to the item create. */
export interface UploadedFile {
  key: string;
  fileName: string;
}

export interface FileUrls {
  /** Inline, for <img> and opening in a tab. */
  viewUrl: string;
  /** Attachment, saved under the original file name. */
  downloadUrl: string;
}
