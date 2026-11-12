import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { importCollections, importItems, refresh } = vi.hoisted(() => ({
  importCollections: vi.fn(),
  importItems: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/features/import-export/actions/import", () => ({
  importCollections,
  importItems,
}));
// The real unstable_rethrow: the run tells a redirect from a failure with it,
// and the real redirect makes the error the test sends.
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof Navigation>();
  return {
    redirect: actual.redirect,
    unstable_rethrow: actual.unstable_rethrow,
    useRouter: () => ({ refresh }),
  };
});

import { redirect } from "next/navigation";
import type * as Navigation from "next/navigation";

import { ImportButton } from "@/features/import-export/_internal/components/ImportButton";

// The error Next itself throws when an action redirects (a session that ended).
function redirectError(): unknown {
  try {
    redirect("/sign-in");
  } catch (error) {
    return error;
  }
}

const summary = (fields: object = {}) => ({
  created: 0,
  duplicates: 0,
  files: 0,
  failed: [],
  ...fields,
});

function jsonFile(content: unknown, name = "export.json") {
  return new File([JSON.stringify(content)], name, {
    type: "application/json",
  });
}

const exportFile = {
  version: 1,
  collections: [{ id: "old-c", name: "React" }],
  items: [
    { type: "snippet", title: "A", collectionIds: ["old-c"] },
    { type: "image", title: "Diagram" },
  ],
};

async function choose(file: File) {
  await userEvent.upload(screen.getByLabelText("Import file"), file);
}

describe("ImportButton", () => {
  beforeEach(() => {
    importCollections.mockResolvedValue({
      success: true,
      error: null,
      data: { summary: summary({ created: 1 }), idMap: { "old-c": "new-c" } },
    });
    importItems.mockResolvedValue({
      success: true,
      error: null,
      data: summary({ created: 1, files: 1 }),
    });
  });

  it("imports collections first, links the items to the new ids, and sums the result", async () => {
    render(<ImportButton />);

    await choose(jsonFile(exportFile));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Import finished. 2 created, 0 already there, 1 files not imported.",
    );
    expect(importItems).toHaveBeenCalledWith([
      { type: "snippet", title: "A", collectionIds: ["new-c"] },
      { type: "image", title: "Diagram" },
    ]);
    expect(importCollections.mock.invocationCallOrder[0]).toBeLessThan(
      importItems.mock.invocationCallOrder[0],
    );
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed or newer file in plain words and sends nothing", async () => {
    render(<ImportButton />);

    await choose(new File(["{oops"], "bad.json"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This file is not valid JSON",
    );

    await choose(jsonFile({ ...exportFile, version: 2 }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This file is from a version of DevStash this app cannot read",
    );
    expect(importCollections).not.toHaveBeenCalled();
    expect(importItems).not.toHaveBeenCalled();
  });

  it("rejects a file over 5 MB before reading it", async () => {
    render(<ImportButton />);
    const file = jsonFile(exportFile);
    Object.defineProperty(file, "size", { value: 6 * 1024 * 1024 });

    await choose(file);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The file is larger than 5 MB",
    );
    expect(importCollections).not.toHaveBeenCalled();
  });

  it("says so when the file cannot be read, and can be used again", async () => {
    render(<ImportButton />);
    const file = jsonFile(exportFile);
    file.text = () => Promise.reject(new DOMException("gone", "NotFoundError"));

    await choose(file);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The file could not be read",
    );
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeEnabled();
  });

  it("shows how far it got when a batch is refused, and the failures", async () => {
    importCollections.mockResolvedValue({
      success: true,
      error: null,
      data: {
        summary: summary({
          failed: [{ title: "Bad", reason: "Enter a name" }],
        }),
        idMap: {},
      },
    });
    importItems.mockResolvedValue({
      success: false,
      error: "Import is a Pro feature",
      data: null,
    });
    render(<ImportButton />);

    await choose(jsonFile(exportFile));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("The import stopped early.");
    expect(status).toHaveTextContent("Import is a Pro feature");
    expect(status).toHaveTextContent("Bad: Enter a name");
  });

  it("stops with what went through when the server cannot be reached", async () => {
    importItems.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<ImportButton />);

    await choose(jsonFile(exportFile));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent("The import stopped early.");
    expect(status).toHaveTextContent("the server could not be reached");
  });

  // The router is already on its way to sign-in: no summary, no error, and
  // nothing more is sent.
  it("stops quietly when an action redirects to sign-in", async () => {
    importCollections.mockRejectedValue(redirectError());
    render(<ImportButton />);

    await choose(jsonFile(exportFile));
    await act(async () => {});

    expect(importCollections).toHaveBeenCalledTimes(1);
    expect(importItems).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("is disabled with its progress while the import runs", async () => {
    const collections = Promise.withResolvers<unknown>();
    importCollections.mockReturnValue(collections.promise);
    render(<ImportButton />);

    await choose(jsonFile(exportFile));

    const button = screen.getByRole("button", {
      name: "Importing… 0 of 3",
    });
    expect(button).toBeDisabled();

    await act(async () => {
      collections.resolve({
        success: true,
        error: null,
        data: { summary: summary({ created: 1 }), idMap: {} },
      });
    });
    expect(await screen.findByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeEnabled();
  });

  it("stops at the next batch when the page is left, with no refresh", async () => {
    const collections = Promise.withResolvers<unknown>();
    importCollections.mockReturnValue(collections.promise);
    const { unmount } = render(<ImportButton />);

    await choose(jsonFile(exportFile));
    unmount();
    await act(async () => {
      collections.resolve({
        success: true,
        error: null,
        data: { summary: summary(), idMap: {} },
      });
    });

    expect(importItems).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
