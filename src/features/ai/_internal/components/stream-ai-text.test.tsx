import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiStreamRequestError,
  streamAiText,
} from "@/features/ai/_internal/components/stream-ai-text";
import { fail } from "@/lib/errors/action-result";

const fetchMock = vi.fn();

function streamOf(...chunks: Uint8Array[]) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
  );
}

const bytes = (text: string) => new TextEncoder().encode(text);

async function run(signal = new AbortController().signal) {
  const pieces: string[] = [];
  await streamAiText("/api/ai/explain", { code: "x" }, signal, (piece) =>
    pieces.push(piece),
  );
  return pieces;
}

describe("streamAiText", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  it("posts the body as JSON with the caller's signal", async () => {
    fetchMock.mockResolvedValue(streamOf(bytes("a")));
    const { signal } = new AbortController();

    await run(signal);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/ai/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"code":"x"}',
      signal,
    });
  });

  it("calls back with each piece as it arrives", async () => {
    fetchMock.mockResolvedValue(streamOf(bytes("Hello"), bytes(" world")));

    expect(await run()).toEqual(["Hello", " world"]);
  });

  it("puts a character split across two reads together", async () => {
    const euro = bytes("€");
    fetchMock.mockResolvedValue(streamOf(euro.slice(0, 1), euro.slice(1)));

    expect((await run()).join("")).toBe("€");
  });

  it("throws the code of a refusal", async () => {
    fetchMock.mockResolvedValue(
      Response.json(fail("aiDailyLimit"), { status: 429 }),
    );

    const error: unknown = await run().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(AiStreamRequestError);
    expect((error as AiStreamRequestError).failure.error).toBe("aiDailyLimit");
  });

  it("counts an answer that is not ours as unavailable", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 504 }));

    await expect(run()).rejects.toMatchObject({
      failure: { error: "aiUnavailable" },
    });
  });

  it("throws the error of a stream that broke", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        new ReadableStream({
          start: (controller) => controller.error(new TypeError("cut")),
        }),
      ),
    );

    await expect(run()).rejects.toThrow("cut");
  });
});
