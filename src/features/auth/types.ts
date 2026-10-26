export interface AuthActionState {
  success: boolean;
  data: null;
  error: string | null;
}

export interface VerifyEmailResult {
  success: boolean;
  error: string | null;
}

export interface PasswordResetResult {
  success: boolean;
  error: string | null;
}

export interface ChangePasswordResult {
  success: boolean;
  error: string | null;
}

export interface DeleteAccountResult {
  success: boolean;
  error: string | null;
}

export interface UserProfile {
  name: string | null;
  email: string;
  image: string | null;
  createdAt: Date;
  /** False for accounts that only sign in with an OAuth provider. */
  hasPassword: boolean;
}
