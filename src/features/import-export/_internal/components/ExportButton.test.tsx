import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { downloadExport, toastError } = vi.hoisted(() => ({
  downloadExport: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/features/import-export/_internal/components/fetch-export", () => ({
  downloadExport,
}));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import { ExportButton } from "@/features/import-export/_internal/components/ExportButton";

describe("ExportButton", () => {
  it("is pending and disabled until the download is done", async () => {
    const download = Promise.withResolvers<{ error: string | null }>();
    downloadExport.mockReturnValue(download.promise);
    render(<ExportButton />);

    await userEvent.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(screen.getByRole("button", { name: "Exporting…" })).toBeDisabled();
    await act(async () => download.resolve({ error: null }));
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeEnabled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it("says why the export failed, in the words of its code", async () => {
    downloadExport.mockResolvedValue({ error: { error: "exportRateLimited" } });
    render(<ExportButton />);

    await userEvent.click(screen.getByRole("button", { name: "Export JSON" }));

    expect(toastError).toHaveBeenCalledWith("You can export once a minute");
  });
});
