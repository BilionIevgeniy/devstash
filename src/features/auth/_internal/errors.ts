import { CredentialsSignin } from "next-auth";

export const EMAIL_NOT_VERIFIED_CODE = "email_not_verified";

export class EmailNotVerifiedError extends CredentialsSignin {
  code = EMAIL_NOT_VERIFIED_CODE;
}

export const TOO_MANY_ATTEMPTS_CODE = "too_many_attempts";

export class TooManyAttemptsError extends CredentialsSignin {
  code = TOO_MANY_ATTEMPTS_CODE;
}
