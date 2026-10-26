import "server-only";

import { cache } from "react";
import type { UserProfile } from "@/features/auth/types";
import { prisma } from "@/lib/prisma";

// cache() lets the profile sections share one read per request.
export const getUserProfile = cache(
  async (userId: string): Promise<UserProfile | null> => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        image: true,
        createdAt: true,
        password: true,
      },
    });
    if (!user) return null;

    const { password, ...profile } = user;
    return { ...profile, hasPassword: password !== null };
  },
);
