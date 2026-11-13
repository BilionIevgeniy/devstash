import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ItemMeta } from "@/features/items/_internal/components/ItemMeta";
import type { ItemDetailJson } from "@/features/items/types";

import { render, screen } from "../../../../../test/intl";

// Noon in Berlin, so the date is the same in every time zone of the runner.
const NOW = new Date("2026-11-10T11:00:00Z");

const detail = {
  createdAt: "2026-11-10T09:00:00Z",
  updatedAt: "2026-11-10T09:00:00Z",
  collections: [],
} as unknown as ItemDetailJson;

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

// The dates of an item in the locale of the page: the numeric date it was
// created on, and how long ago it was updated (feature 11, acceptance).
describe("ItemMeta", () => {
  it("shows the dates in English", () => {
    render(<ItemMeta detail={detail} />);

    expect(screen.getByText("Created")).toBeInTheDocument();
    expect(screen.getByText("11/10/2026")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toHaveAttribute(
      "title",
      "11/10/2026",
    );
  });

  it("shows the dates in German", () => {
    render(<ItemMeta detail={detail} />, { locale: "de" });

    expect(screen.getByText("Erstellt")).toBeInTheDocument();
    expect(screen.getByText("10.11.2026")).toBeInTheDocument();
    expect(screen.getByText("vor 2 Stunden")).toBeInTheDocument();
  });
});
