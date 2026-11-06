import { z } from "zod";

export const planSchema = z.enum(["monthly", "yearly"]);
export type Plan = z.infer<typeof planSchema>;

export const checkoutSessionIdSchema = z.string().startsWith("cs_").max(255);
