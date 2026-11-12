import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));

import { ItemListFilters } from "@/app/(app)/items/[type]/_components/ItemListFilters";
import {
  DEFAULT_ITEM_LIST_PARAMS,
  type ItemListParams,
} from "@/features/items/domain/list-params";

const BASE = "/items/snippets";

function filters(params: Partial<ItemListParams>, tags: string[]) {
  return (
    <ItemListFilters
      basePath={BASE}
      params={{ ...DEFAULT_ITEM_LIST_PARAMS, ...params }}
      tags={tags}
    />
  );
}

// `showParams` stands for the server's answer: the page renders again with the
// params of the new URL.
function renderFilters(
  params: Partial<ItemListParams> = {},
  tags = ["api", "react"],
) {
  const view = render(filters(params, tags));
  return {
    user: userEvent.setup(),
    showParams: (next: Partial<ItemListParams>) =>
      view.rerender(filters(next, tags)),
  };
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  control: string,
  option: string,
) {
  await user.click(screen.getByRole("combobox", { name: control }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("ItemListFilters", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("replaces the URL with the new sort, back to page 1, without scrolling", async () => {
    const { user } = renderFilters({ tag: "react", page: 3 });

    await choose(user, "Sort items", "A-Z");

    expect(replace).toHaveBeenCalledExactlyOnceWith(
      `${BASE}?sort=a-z&tag=react`,
      { scroll: false },
    );
  });

  it("filters by a tag and clears it with All tags", async () => {
    const { user, showParams } = renderFilters({ sort: "z-a" });

    await choose(user, "Filter by tag", "react");
    expect(replace).toHaveBeenLastCalledWith(`${BASE}?sort=z-a&tag=react`, {
      scroll: false,
    });

    showParams({ sort: "z-a", tag: "react" });

    await choose(user, "Filter by tag", "All tags");
    expect(replace).toHaveBeenLastCalledWith(`${BASE}?sort=z-a`, {
      scroll: false,
    });
  });

  it("shows a tag from the URL that no item has any more", () => {
    renderFilters({ tag: "gone" }, ["api"]);

    expect(
      screen.getByRole("combobox", { name: "Filter by tag" }),
    ).toHaveTextContent("gone");
  });

  it("offers no tag filter for a type without tags", () => {
    renderFilters({}, []);

    expect(
      screen.queryByRole("combobox", { name: "Filter by tag" }),
    ).not.toBeInTheDocument();
  });
});
