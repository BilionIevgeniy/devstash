import { useState } from "react";

import type { UploadedFile } from "@/features/files/types";

// The type the create form is on and the upload made for it. An upload
// belongs to the kind it was made for, so a type switch drops it; the form's
// key on its file field remounts it, which aborts a running PUT.
export function useTypeChoice(initialType: string) {
  const [typeName, setTypeName] = useState(initialType);
  const [upload, setUpload] = useState<UploadedFile | null>(null);

  function changeType(value: string) {
    setTypeName(value);
    setUpload(null);
  }

  return { typeName, changeType, upload, setUpload };
}
