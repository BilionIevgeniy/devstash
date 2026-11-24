import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import {
  doneStep,
  submitEmailLink,
} from "@/features/auth/_internal/components/finish-email-link";
import type { FormActionState } from "@/features/auth/types";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";

const replace = vi.fn();
const router = { replace } as unknown as Parameters<typeof submitEmailLink>[0];
const VALUES = { password: "typed" };
const INITIAL: FormActionState<"password"> = {
  error: null,
  values: { password: "" },
};

const submit = (
  action: () => Promise<OperationResult<unknown>>,
  reason: Parameters<typeof doneStep>[0] = null,
) => submitEmailLink(router, doneStep(reason, "Done"), VALUES, INITIAL, action);

describe("submitEmailLink", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("keeps no typed password after a success and replaces the used link", async () => {
    const state = await submit(async () => ok());

    expect(state).toEqual(INITIAL);
    expect(toast.success).toHaveBeenCalledExactlyOnceWith("Done");
    expect(replace).toHaveBeenCalledExactlyOnceWith("/sign-in");
  });

  it("leaves the words to the switch page while another account is signed in", async () => {
    await submit(async () => ok(), "email");

    expect(toast.success).not.toHaveBeenCalled();
    expect(replace.mock.calls[0][0]).toContain("/switch-account");
  });

  it("puts the values back with a refusal, and goes nowhere", async () => {
    const state = await submit(async () => fail("invalidResetLink"));

    expect(state).toMatchObject({
      error: { error: "invalidResetLink" },
      values: VALUES,
    });
    expect(replace).not.toHaveBeenCalled();
  });

  it("shows a failed call as a plain failure, with the values", async () => {
    const state = await submit(() => Promise.reject(new TypeError("offline")));

    expect(state).toEqual({ error: { error: "generic" }, values: VALUES });
  });
});
