import { beforeEach, describe, expect, it, vi } from "vitest";

const { presignUpload, getSessionUser } = vi.hoisted(() => ({
  presignUpload: vi.fn(),
  getSessionUser: vi.fn(),
}));
vi.mock("@/features/files/services/presign-upload", () => ({ presignUpload }));
vi.mock("@/features/auth/nextauth/session", () => ({ getSessionUser }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { requestUpload } from "@/features/files/actions/upload";

const INPUT = { kind: "file", fileName: "notes.md", size: 10 };

beforeEach(() => {
  vi.resetAllMocks();
  getSessionUser.mockResolvedValue({ id: "user-1" });
});

// An action passes a refused result on as it is: a new fail() around its code
// would drop the params the message needs (ADR 0022).
describe("requestUpload", () => {
  it("passes the service's failure on with its params", async () => {
    const refused = {
      success: false,
      data: null,
      error: "tooManyAttempts",
      params: { minutes: 4 },
    };
    presignUpload.mockResolvedValue(refused);

    await expect(requestUpload(INPUT)).resolves.toEqual(refused);
  });

  it("answers its own code when the service throws", async () => {
    presignUpload.mockRejectedValue(new Error("r2"));

    await expect(requestUpload(INPUT)).resolves.toEqual({
      success: false,
      data: null,
      error: "uploadStartFailed",
    });
  });

  it("refuses input the schema refuses before the service", async () => {
    await expect(
      requestUpload({ ...INPUT, fileName: "x".repeat(300) }),
    ).resolves.toEqual({
      success: false,
      data: null,
      error: "fileNameTooLong",
    });
    expect(presignUpload).not.toHaveBeenCalled();
  });
});
