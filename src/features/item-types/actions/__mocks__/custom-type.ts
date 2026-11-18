import { fn } from "storybook/test";

import type * as Actions from "@/features/item-types/actions/custom-type";
import { ok } from "@/lib/errors/action-result";

// What the stories get instead of ../custom-type (registered with sb.mock in
// .storybook/preview.tsx; ADR 0026). Only types are imported from the real
// module, which reaches the session, the services and Prisma. Each action
// succeeds unless a story sets another answer.
export const createCustomType = fn<typeof Actions.createCustomType>(async () =>
  ok(),
);
export const updateCustomType = fn<typeof Actions.updateCustomType>(async () =>
  ok(),
);
export const deleteCustomType = fn<typeof Actions.deleteCustomType>(async () =>
  ok(),
);
