const MINUTE_SECONDS = 60;

// `reset` is the Unix time in milliseconds at which the window ends. Never
// below one second, so a refusal always tells the client to wait.
export function getRetryAfterSeconds(reset: number, now: number): number {
  return Math.max(1, Math.ceil((reset - now) / 1000));
}

// Rounds up to whole minutes: telling a client to retry earlier than the
// window ends would only earn it another refusal.
// The params of the `tooManyAttempts` error code.
export function tooManyAttemptsParams(
  reset: number,
  now: number,
): { minutes: number } {
  const seconds = getRetryAfterSeconds(reset, now);
  return { minutes: Math.max(1, Math.ceil(seconds / MINUTE_SECONDS)) };
}
