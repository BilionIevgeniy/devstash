import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GlobalError from "@/app/global-error";
import { logger } from "@/lib/logger";

// The hook is real: this proves that the boundary uses it, and what it shows.
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

describe("GlobalError", () => {
  it("shows the digest of a server error as a reference, and does not report it again", () => {
    const error = Object.assign(new Error("hidden"), { digest: "1234567890" });

    render(<GlobalError error={error} retry={() => {}} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Reference: 1234567890",
    );
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("reports an error thrown in the browser, which has no digest", () => {
    const error = new TypeError("x is undefined");

    render(<GlobalError error={error} retry={() => {}} />);

    expect(screen.getByRole("alert")).not.toHaveTextContent("Reference");
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      expect.stringContaining("failed to render in the browser"),
      { error },
    );
  });
});
