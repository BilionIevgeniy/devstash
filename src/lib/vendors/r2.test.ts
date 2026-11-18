import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());

// Each command keeps its name and input, so the test can answer per command.
vi.mock("@aws-sdk/client-s3", () => {
  const command = (name: string) =>
    class {
      readonly name = name;
      constructor(readonly input: Record<string, unknown>) {}
    };
  return {
    S3Client: class {
      send = send;
    },
    ListObjectsV2Command: command("list"),
    DeleteObjectsCommand: command("delete"),
    DeleteObjectCommand: command("deleteOne"),
    GetObjectCommand: command("get"),
    HeadObjectCommand: command("head"),
    PutObjectCommand: command("put"),
    NotFound: class extends Error {},
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: vi.fn() }));

vi.stubEnv("R2_ACCOUNT_ID", "account");
vi.stubEnv("R2_ACCESS_KEY_ID", "key");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "secret");
vi.stubEnv("R2_BUCKET_NAME", "bucket");

import { NotFound } from "@aws-sdk/client-s3";
import {
  deleteObjects,
  deletePrefix,
  headObject,
  listObjectsPage,
} from "@/lib/vendors/r2";

const CREATED = new Date("2026-11-01T10:00:00Z");

interface SentCommand {
  name: string;
  input: Record<string, unknown>;
}

function sentOf(name: string): SentCommand[] {
  return send.mock.calls
    .map(([command]) => command as SentCommand)
    .filter((command) => command.name === name);
}

describe("deletePrefix", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("deletes every page of the prefix", async () => {
    send.mockImplementation(async (command: SentCommand) => {
      if (command.name === "delete") return {};
      return command.input.ContinuationToken
        ? {
            Contents: [{ Key: "users/u1/b.png", LastModified: CREATED }],
            IsTruncated: false,
          }
        : {
            Contents: [{ Key: "users/u1/a.png", LastModified: CREATED }],
            IsTruncated: true,
            NextContinuationToken: "page-2",
          };
    });

    await deletePrefix("users/u1/");

    const lists = sentOf("list");
    expect(lists.map(({ input }) => input.Prefix)).toEqual([
      "users/u1/",
      "users/u1/",
    ]);
    expect(lists[1].input.ContinuationToken).toBe("page-2");
    expect(sentOf("delete").map(({ input }) => input.Delete)).toEqual([
      { Objects: [{ Key: "users/u1/a.png" }], Quiet: true },
      { Objects: [{ Key: "users/u1/b.png" }], Quiet: true },
    ]);
  });

  // The account purge must not leave an object behind because R2 gave no date.
  it("deletes an object listed without a date too", async () => {
    send.mockImplementation(async (command: SentCommand) =>
      command.name === "delete"
        ? {}
        : { Contents: [{ Key: "users/u1/no-date.png" }], IsTruncated: false },
    );

    await deletePrefix("users/u1/");

    expect(sentOf("delete").map(({ input }) => input.Delete)).toEqual([
      { Objects: [{ Key: "users/u1/no-date.png" }], Quiet: true },
    ]);
  });

  it("sends no delete for an empty prefix", async () => {
    send.mockResolvedValue({ IsTruncated: false });

    await deletePrefix("users/u1/");

    expect(sentOf("delete")).toHaveLength(0);
  });

  // The account delete relies on this to abort before it removes the rows.
  it("throws when R2 keeps any object", async () => {
    send.mockImplementation(async (command: SentCommand) =>
      command.name === "delete"
        ? { Errors: [{ Key: "users/u1/a.png", Code: "InternalError" }] }
        : {
            Contents: [{ Key: "users/u1/a.png", LastModified: CREATED }],
            IsTruncated: false,
          },
    );

    await expect(deletePrefix("users/u1/")).rejects.toThrow(
      "R2 kept 1 objects",
    );
  });
});

describe("headObject", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("gives the size, the stored Content-Type and the write time", async () => {
    send.mockResolvedValue({
      ContentLength: 2048,
      ContentType: "image/png",
      LastModified: CREATED,
    });

    expect(await headObject("users/u1/a.png")).toEqual({
      size: 2048,
      contentType: "image/png",
      lastModified: CREATED,
    });
  });

  // confirmUpload answers "upload not found" on null.
  it("answers null when there is no object", async () => {
    send.mockRejectedValue(new NotFound({ message: "", $metadata: {} }));

    expect(await headObject("users/u1/a.png")).toBeNull();
  });

  it("does not hide other errors as a missing object", async () => {
    send.mockRejectedValue(new Error("R2 down"));

    await expect(headObject("users/u1/a.png")).rejects.toThrow("R2 down");
  });
});

describe("listObjectsPage", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("gives the keys with their write time and the next page's token", async () => {
    send.mockResolvedValue({
      Contents: [
        { Key: "users/u1/a.png", LastModified: CREATED },
        { Key: "users/u1/no-date.png" },
      ],
      IsTruncated: true,
      NextContinuationToken: "page-2",
    });

    expect(await listObjectsPage("users/", "page-1")).toEqual({
      objects: [
        { key: "users/u1/a.png", lastModified: CREATED },
        { key: "users/u1/no-date.png", lastModified: null },
      ],
      next: "page-2",
    });
    expect(sentOf("list")[0].input).toMatchObject({
      Prefix: "users/",
      ContinuationToken: "page-1",
    });
  });

  it("has no next token on the last page", async () => {
    send.mockResolvedValue({ Contents: [], IsTruncated: false });

    expect((await listObjectsPage("users/")).next).toBeUndefined();
  });
});

describe("deleteObjects", () => {
  beforeEach(() => {
    send.mockReset();
  });

  it("sends nothing for no keys", async () => {
    await deleteObjects([]);
    expect(send).not.toHaveBeenCalled();
  });

  it("throws when R2 keeps a key", async () => {
    send.mockResolvedValue({ Errors: [{ Key: "users/u1/a.png" }] });
    await expect(deleteObjects(["users/u1/a.png"])).rejects.toThrow(
      "R2 kept 1 objects",
    );
  });
});
