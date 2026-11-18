import { z } from "zod";

import { MAX_PASSWORD_LENGTH } from "@/features/auth/domain/password-reset";

// The longest token a link can carry; ours are far shorter.
const DELETION_TOKEN_MAX = 200;

// No password for an account that has none: it proves itself with the token of
// the emailed deletion link instead.
export const deleteAccountSchema = z.object({
  password: z.string().max(MAX_PASSWORD_LENGTH, "passwordTooLong").optional(),
  token: z.string().min(1).max(DELETION_TOKEN_MAX).optional(),
});
