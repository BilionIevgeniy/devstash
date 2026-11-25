import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, resend, logError } = vi.hoisted(() => ({
  send: vi.fn(),
  resend: vi.fn(),
  logError: vi.fn(async () => {}),
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    constructor(key: string) {
      resend(key);
    }
  },
}));
vi.mock("@/lib/observability/logger", () => ({
  logger: { error: logError, warn: vi.fn(), info: vi.fn() },
}));

import { sendEmail } from "@/lib/vendors/email";

const EMAIL = {
  to: "ada@example.com",
  subject: "Hello",
  html: "<p>Hello</p>",
  text: "Hello",
};
const FAILED = { success: false, data: null, error: "emailSendFailed" };

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "key");
    vi.stubEnv("EMAIL_FROM", "DevStash <noreply@example.com>");
    send.mockResolvedValue({ data: { id: "m1" }, error: null });
  });

  it("sends from our address, with no idempotency key of its own", async () => {
    await expect(sendEmail(EMAIL)).resolves.toMatchObject({ success: true });

    expect(resend).toHaveBeenCalledWith("key");
    expect(send).toHaveBeenCalledExactlyOnceWith(
      { from: "DevStash <noreply@example.com>", ...EMAIL },
      undefined,
    );
  });

  it("passes the idempotency key on, so a retry sends nothing twice", async () => {
    await sendEmail({ ...EMAIL, idempotencyKey: "contract-1" });

    expect(send).toHaveBeenCalledWith(
      expect.not.objectContaining({ idempotencyKey: "contract-1" }),
      {
        idempotencyKey: "contract-1",
      },
    );
  });

  it.each(["RESEND_API_KEY", "EMAIL_FROM"])(
    "fails loudly without %s and sends nothing",
    async (name) => {
      vi.stubEnv(name, "");

      await expect(sendEmail(EMAIL)).resolves.toMatchObject(FAILED);
      expect(send).not.toHaveBeenCalled();
      expect(logError).toHaveBeenCalledOnce();
    },
  );

  it("fails when Resend rejects the email", async () => {
    send.mockResolvedValue({ data: null, error: { name: "validation_error" } });

    await expect(sendEmail(EMAIL)).resolves.toMatchObject(FAILED);
    expect(logError).toHaveBeenCalledOnce();
  });

  it("fails when Resend cannot be reached", async () => {
    send.mockRejectedValue(new TypeError("fetch failed"));

    await expect(sendEmail(EMAIL)).resolves.toMatchObject(FAILED);
  });
});
