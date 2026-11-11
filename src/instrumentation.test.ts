import { afterEach, describe, expect, it, vi } from "vitest";
// `@/lib/sentry` is the stub of vitest.shared.mts here, in this file and in
// instrumentation.ts alike.
import { onRequestError as libOnRequestError } from "@/lib/sentry";
import { initSentryServer } from "@/lib/sentry-server";
import { onRequestError, register } from "./instrumentation";

vi.mock("@/lib/sentry-server", () => ({ initSentryServer: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("register", () => {
  it("starts the SDK on the Node.js runtime", async () => {
    vi.stubEnv("NEXT_RUNTIME", "nodejs");

    await register();

    expect(initSentryServer).toHaveBeenCalledOnce();
  });

  it.each(["edge", undefined])(
    "starts nothing when the runtime is %s: only Node.js is started",
    async (runtime) => {
      vi.stubEnv("NEXT_RUNTIME", runtime);

      await register();

      expect(initSentryServer).not.toHaveBeenCalled();
    },
  );
});

describe("onRequestError", () => {
  it("is exported under the name Next.js looks for, and is the one of lib/sentry", () => {
    expect(onRequestError).toBe(libOnRequestError);
  });
});
