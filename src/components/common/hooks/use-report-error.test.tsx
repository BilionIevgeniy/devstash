import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useReportError } from "@/components/common/hooks/use-report-error";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const MESSAGE = "A page failed to render in the browser";

function setup(error: unknown) {
  return renderHook(({ current }) => useReportError(current, MESSAGE), {
    initialProps: { current: error },
  });
}

describe("useReportError", () => {
  it("reports an error thrown in the browser, which has no digest", () => {
    const error = new TypeError("x is undefined");

    const { result } = setup(error);

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(MESSAGE, { error });
    expect(result.current).toBeUndefined();
  });

  it("does not report a server error: onRequestError already did, and returns its digest", () => {
    const error = Object.assign(new Error("hidden"), { digest: "1234567890" });

    const { result } = setup(error);

    expect(logger.error).not.toHaveBeenCalled();
    expect(result.current).toBe("1234567890");
  });

  it("reports a thrown value that is not an error object", () => {
    setup("boom");

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(MESSAGE, {
      error: "boom",
    });
  });

  it("reports an error once, however often the boundary renders", () => {
    const error = new Error("render failed");
    const { rerender } = setup(error);

    rerender({ current: error });
    rerender({ current: error });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("reports the next error when the boundary shows another one", () => {
    const { rerender } = setup(new Error("first"));
    const second = new Error("second");

    rerender({ current: second });

    expect(logger.error).toHaveBeenCalledTimes(2);
    expect(logger.error).toHaveBeenLastCalledWith(MESSAGE, { error: second });
  });
});
