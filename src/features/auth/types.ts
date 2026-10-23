export interface AuthActionState {
  success: boolean;
  data: null;
  error: string | null;
}

export interface VerifyEmailResult {
  success: boolean;
  error: string | null;
}
