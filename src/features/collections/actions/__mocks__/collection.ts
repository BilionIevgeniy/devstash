import { fn } from "storybook/test";

import type * as Actions from "@/features/collections/actions/collection";
import { ok } from "@/lib/action-result";

// What the stories get instead of ../collection (registered with sb.mock in
// .storybook/preview.tsx; ADR 0026). A mock file and not an automock: an
// automock still evaluates the real module, and this one reaches the session,
// the services and Prisma. Only types are imported from it. Each action
// succeeds unless a story sets another answer.
export const createCollection = fn<typeof Actions.createCollection>(async () =>
  ok(),
);
export const updateCollection = fn<typeof Actions.updateCollection>(async () =>
  ok(),
);
export const setCollectionFavorite = fn<typeof Actions.setCollectionFavorite>(
  async () => ok(),
);
export const deleteCollection = fn<typeof Actions.deleteCollection>(async () =>
  ok(),
);
