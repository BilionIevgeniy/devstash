import { z } from "zod";

import { MAX_PASSWORD_LENGTH } from "@/features/auth/domain/password-reset";

// No password for an account that has none: it proves itself with a recent
// sign-in instead.
export const deleteAccountSchema = z.object({
  password: z.string().max(MAX_PASSWORD_LENGTH).optional(),
});
