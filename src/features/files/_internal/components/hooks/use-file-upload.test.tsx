import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";

import { FakeXhr, installFakeXhr } from "../../../../../../test/fake-xhr";
import { act, renderHook } from "../../../../../../test/intl";

const requestUpload = vi.hoisted(() => vi.fn());
vi.mock("@/features/files/actions/upload", () => ({ requestUpload }));

import { useFileUpload } from "@/features/files/_internal/components/hooks/use-file-upload";
import { fail, ok } from "@/lib/errors/action-result";

const FILE = new File(["hello"], "notes.md");
const OTHER = new File(["other"], "other.txt");

function signed(key: string) {
  return ok({
    uploadUrl: `https://r2.test/${key}`,
    key,
    contentType: "text/markdown",
  });
}

function setup() {
  const onChange = vi.fn();
  const view = renderHook(() => useFileUpload("file", onChange));
  return { onChange, ...view };
}

describe("useFileUpload", () => {
  beforeEach(() => {
    installFakeXhr();
    requestUpload.mockResolvedValue(signed("key-1"));
  });

  it("goes from the signed URL over the progress to the upload's key", async () => {
    const { result, onChange } = setup();

    await act(async () => result.current.upload(FILE));
    expect(result.current.state).toEqual({
      status: "uploading",
      file: FILE,
      progress: 0,
    });

    act(() => FakeXhr.last().progress(1, 2));
    expect(result.current.state).toMatchObject({ progress: 50 });

    act(() => FakeXhr.last().answer(200));
    expect(result.current.state).toEqual({ status: "done", file: FILE });
    expect(onChange).toHaveBeenLastCalledWith({
      key: "key-1",
      fileName: "notes.md",
    });
  });

  it("refuses a file the rules refuse, without asking the server", async () => {
    const { result } = setup();

    await act(async () => result.current.upload(new File(["x"], "virus.exe")));

    expect(result.current.state.status).toBe("failed");
    expect(requestUpload).not.toHaveBeenCalled();
  });

  it("shows the refusal of the server, and a failed call as a failed upload", async () => {
    const { result } = setup();

    requestUpload.mockResolvedValue(fail("uploadStartFailed"));
    await act(async () => result.current.upload(FILE));
    expect(result.current.state).toMatchObject({
      status: "failed",
      error: { error: "uploadStartFailed" },
    });

    requestUpload.mockRejectedValue(new TypeError("offline"));
    await act(async () => result.current.upload(FILE));
    expect(result.current.state).toMatchObject({
      status: "failed",
      error: { error: "uploadFailed" },
    });
    expect(FakeXhr.requests).toEqual([]);
  });

  it("ends a PUT that R2 refuses as failed, with nothing for the form", async () => {
    const { result, onChange } = setup();

    await act(async () => result.current.upload(FILE));
    act(() => FakeXhr.last().answer(403));

    expect(result.current.state).toMatchObject({
      status: "failed",
      file: FILE,
    });
    expect(onChange.mock.calls).toEqual([[null]]);
  });

  // A session that ended: the router is leaving, so a failure would flash.
  it("shows no failure for the redirect of a signed-out caller", async () => {
    requestUpload.mockImplementation(async () => redirect("/sign-in"));
    const { result } = setup();

    await act(async () => result.current.upload(FILE));

    expect(result.current.state.status).toBe("uploading");
    expect(FakeXhr.requests).toEqual([]);
  });

  it("drops the signed URL of an attempt another upload replaced", async () => {
    const slow = Promise.withResolvers<ReturnType<typeof signed>>();
    requestUpload
      .mockReturnValueOnce(slow.promise)
      .mockResolvedValueOnce(signed("key-2"));
    const { result } = setup();

    let first: Promise<void> | undefined;
    act(() => {
      first = result.current.upload(FILE);
    });
    await act(async () => result.current.upload(OTHER));
    await act(async () => {
      slow.resolve(signed("key-1"));
      await first;
    });

    expect(FakeXhr.requests.map(({ url }) => url)).toEqual([
      "https://r2.test/key-2",
    ]);
    expect(result.current.state).toMatchObject({ file: OTHER });
  });

  it("aborts the running PUT when another upload starts", async () => {
    const { result } = setup();

    await act(async () => result.current.upload(FILE));
    const first = FakeXhr.last();
    await act(async () => result.current.upload(OTHER));

    expect(first.aborted).toBe(true);
  });

  it("reset aborts the PUT, and a signed URL that comes later starts none", async () => {
    const { result, onChange } = setup();
    await act(async () => result.current.upload(FILE));
    act(() => result.current.reset());
    expect(FakeXhr.last().aborted).toBe(true);
    expect(result.current.state).toEqual({ status: "idle" });
    expect(onChange).toHaveBeenLastCalledWith(null);

    installFakeXhr();
    const slow = Promise.withResolvers<ReturnType<typeof signed>>();
    requestUpload.mockReturnValue(slow.promise);
    act(() => void result.current.upload(FILE));
    act(() => result.current.reset());
    await act(async () => slow.resolve(signed("late")));

    expect(FakeXhr.requests).toEqual([]);
    expect(result.current.state).toEqual({ status: "idle" });
  });

  it("unmounting aborts the PUT, and a signed URL that comes later starts none", async () => {
    const running = setup();
    await act(async () => running.result.current.upload(FILE));
    running.unmount();
    expect(FakeXhr.last().aborted).toBe(true);

    installFakeXhr();
    const slow = Promise.withResolvers<ReturnType<typeof signed>>();
    requestUpload.mockReturnValue(slow.promise);
    const waiting = setup();
    act(() => void waiting.result.current.upload(FILE));
    waiting.unmount();
    await act(async () => slow.resolve(signed("late")));

    expect(FakeXhr.requests).toEqual([]);
  });
});
