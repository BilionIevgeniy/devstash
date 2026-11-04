import { z } from "zod";

import {
  EDITOR_THEMES,
  FONT_SIZES,
  TAB_SIZES,
} from "@/features/editor/_internal/domain/preferences";

export const editorPreferencesSchema = z.object({
  fontSize: z
    .number()
    .refine((size) => FONT_SIZES.includes(size), "Invalid font size"),
  tabSize: z
    .number()
    .refine((size) => TAB_SIZES.includes(size), "Invalid tab size"),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme: z.enum(EDITOR_THEMES),
});

export type EditorPreferencesInput = z.infer<typeof editorPreferencesSchema>;
