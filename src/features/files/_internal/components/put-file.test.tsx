import { beforeEach, describe, expect, it, vi } from "vitest";

import { FakeXhr, installFakeXhr } from "../../../../../test/fake-xhr";
import { startPut } from "@/features/files/_internal/components/put-file";

const FILE = new File(["hello"], "notes.md");

function put() {
  const onProgress = vi.fn();
  const onDone = vi.fn();
  startPut({
    url: "https://r2.test/signed",
    file: FILE,
    contentType: "text/markdown",
    onProgress,
    onDone,
  });
  return { onProgress, onDone, request: FakeXhr.last() };
}

describe("startPut", () => {
  beforeEach(() => {
    installFakeXhr();
  });

  it("sends the file to the signed URL with the signed type", () => {
    const { request } = put();

    expect(request.method).toBe("PUT");
    expect(request.url).toBe("https://r2.test/signed");
    expect(request.headers).toEqual({ "Content-Type": "text/markdown" });
    expect(request.body).toBe(FILE);
  });

  it("reports whole percents, and nothing for an unknown length", () => {
    const { request, onProgress } = put();

    request.progress(1, 3);
    request.progress(5, 0, false);

    expect(onProgress).toHaveBeenCalledExactlyOnceWith(33);
  });

  it.each([
    [200, true],
    [204, true],
    [403, false],
    [500, false],
  ])("is done with a status of %i as %s", (status, isOk) => {
    const { request, onDone } = put();

    request.answer(status);

    expect(onDone).toHaveBeenCalledExactlyOnceWith(isOk);
  });

  it("is done as failed when the connection breaks", () => {
    const { request, onDone } = put();

    request.fail();

    expect(onDone).toHaveBeenCalledExactlyOnceWith(false);
  });

  // The caller that aborts has already moved on.
  it("reports nothing for an abort", () => {
    const { request, onDone } = put();

    request.abort();

    expect(onDone).not.toHaveBeenCalled();
  });
});
