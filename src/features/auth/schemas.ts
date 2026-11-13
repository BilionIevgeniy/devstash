import { z } from "zod";
import { safeCallbackPath } from "@/features/auth/domain/callback-url";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/features/auth/domain/password-reset";
import { EMAIL_MAX, NAME_MAX } from "@/features/auth/domain/registration";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX, "invalidEmail")
  .pipe(z.email("invalidEmail"));

const newPasswordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, "passwordTooShort")
  .max(MAX_PASSWORD_LENGTH, "passwordTooLong");

export const credentialsSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "passwordRequired"),
});

// Never fails: a bad value becomes the default path, not a sign-in error.
export const callbackPathSchema = z.unknown().transform(safeCallbackPath);

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "nameRequired")
      .max(NAME_MAX, "profileNameTooLong"),
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export const confirmEmailSchema = z.object({
  email: emailSchema,
  token: z.string().min(1),
  password: z
    .string()
    .min(1, "passwordRequired")
    .max(MAX_PASSWORD_LENGTH, "passwordTooLong"),
});

export const resetPasswordSchema = z
  .object({
    email: emailSchema,
    token: z.string().min(1),
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "currentPasswordRequired"),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

// The query string of the emailed links.
export const emailLinkParamsSchema = z.object({
  token: z.string().min(1),
  email: emailSchema,
});
