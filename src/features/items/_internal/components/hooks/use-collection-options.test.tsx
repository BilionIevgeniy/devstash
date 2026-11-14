import { describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "../../../../../../test/intl";
import { createQueryClient } from "@/components/common/query-client";
import type { ItemCollectionRef } from "@/features/items/types";
import { fail } from "@/lib/action-result";
import { RouteError } from "@/lib/route-error";

const fetchCollectionOptions = vi.hoisted(() => vi.fn());
vi.mock(
  "@/features/items/_internal/components/fetch-collection-options",
  () => ({
    fetchCollectionOptions,
  }),
);

import { useCollectionOptions } from "@/features/items/_internal/components/hooks/use-collection-options";
import { itemKeys } from "@/features/items/components/item-queries";

const OLD: ItemCollectionRef[] = [{ id: "c-old", name: "Someone else's" }];
const FRESH: ItemCollectionRef[] = [{ id: "c-1", name: "React" }];

describe("useCollectionOptions", () => {
  it("shows the options of its own answer", async () => {
    fetchCollectionOptions.mockResolvedValue(FRESH);

    const { result } = renderHook(() => useCollectionOptions());

    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => {
      expect(result.current).toEqual({ status: "ready", collections: FRESH });
    });
  });

  // The shell's dialogs outlive a change of user in another tab, so options
  // cached before this mount are never shown.
  it("waits for its own answer instead of showing options cached before it mounted", async () => {
    const answer = Promise.withResolvers<ItemCollectionRef[]>();
    fetchCollectionOptions.mockReturnValue(answer.promise);
    const queryClient = createQueryClient();
    queryClient.setQueryData(itemKeys.collectionOptions(), OLD);

    const { result } = renderHook(() => useCollectionOptions(), {
      queryClient,
    });

    expect(result.current).toEqual({ status: "loading" });
    await act(async () => answer.resolve(FRESH));
    await waitFor(() => {
      expect(result.current).toEqual({ status: "ready", collections: FRESH });
    });
  });

  it("shows the error for a refusal, without asking again", async () => {
    fetchCollectionOptions.mockRejectedValue(
      new RouteError(401, fail("unauthorized")),
    );

    const { result } = renderHook(() => useCollectionOptions());

    await waitFor(() => {
      expect(result.current).toEqual({ status: "error" });
    });
    expect(fetchCollectionOptions).toHaveBeenCalledOnce();
  });
});
