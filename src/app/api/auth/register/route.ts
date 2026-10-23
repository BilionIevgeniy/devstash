import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { sendVerificationLink } from "@/features/auth/email-verification";
import { prisma } from "@/lib/prisma";

const BCRYPT_ROUNDS = 12;
const EMAIL_NOT_SENT_MESSAGE =
  "Account created, but we couldn't send the verification email. Request a new one.";

const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Invalid email address")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface RegisteredUser {
  id: string;
  email: string;
  name: string | null;
}

function success(data: RegisteredUser) {
  return Response.json({ success: true, data, error: null }, { status: 201 });
}

function failure(error: string, status: number) {
  return Response.json({ success: false, data: null, error }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failure("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return failure(parsed.error.issues[0].message, 400);
  }
  const { name, email, password } = parsed.data;

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) return failure("User already exists", 409);

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, email: true, name: true },
    });

    const emailResult = await sendVerificationLink(
      user.email,
      new URL(request.url).origin,
    );
    if (!emailResult.success) return failure(EMAIL_NOT_SENT_MESSAGE, 502);

    return success(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return failure("User already exists", 409);
    }
    console.error("Registration failed:", error);
    return failure("Something went wrong", 500);
  }
}
