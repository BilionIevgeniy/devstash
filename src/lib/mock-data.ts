import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";

export const mockUser = {
  id: "user_1",
  email: DEMO_USER_EMAIL,
  name: "John Doe",
  isPro: false,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-15"),
};
