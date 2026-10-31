import "server-only";

import bcrypt from "bcryptjs";

export const BCRYPT_ROUNDS = 12;

// The hash of a random, discarded password at BCRYPT_ROUNDS. Compared against
// when there is no real hash, so a missing account costs the same bcrypt round
// as a wrong password and the timing does not tell them apart. A test keeps
// its cost equal to BCRYPT_ROUNDS.
export const DUMMY_PASSWORD_HASH =
  "$2b$12$dV4hDEQEJnohrB0w36TfK.WtexLdbSOrNKjET3FybGigv23Sr9eo6";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// False when there is no hash, after the same work as a real comparison.
export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const isValid = await bcrypt.compare(password, hash ?? DUMMY_PASSWORD_HASH);
  return Boolean(hash) && isValid;
}
