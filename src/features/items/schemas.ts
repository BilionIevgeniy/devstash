import { z } from "zod";

export const itemIdSchema = z.cuid("Invalid item id");
