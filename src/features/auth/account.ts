import "server-only";

import bcrypt from "bcryptjs";
import { getPasswordResetIdentifier } from "@/features/auth/domain/password-reset";
import type { ChangePasswordResult } from "@/features/auth/types";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;
const NO_PASSWORD_MESSAGE = "This account has no password to change";
const INCORRECT_PASSWORD_MESSAGE = "Current password is incorrect";

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
  if (!user?.password) return { success: false, error: NO_PASSWORD_MESSAGE };

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return { success: false, error: INCORRECT_PASSWORD_MESSAGE };
  }

  const password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password } });
  return { success: true, error: null };
}

// Items, collections, tags, custom types, accounts and sessions go with the
// user through the schema's onDelete: Cascade. Verification and reset tokens
// have no relation to User, so they are removed by identifier.
export async function deleteUserAccount(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) return;

  await prisma.$transaction([
    prisma.verificationToken.deleteMany({
      where: {
        identifier: { in: [user.email, getPasswordResetIdentifier(user.email)] },
      },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
