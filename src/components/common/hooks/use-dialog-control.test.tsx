import { act, renderHook } from "../../../../test/intl";
import { describe, expect, it, vi } from "vitest";

import {
  useDialogControl,
  type DialogControl,
} from "@/components/common/hooks/use-dialog-control";
import { fail, ok, type OperationResult } from "@/lib/errors/action-result";

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function setup(controlled?: DialogControl) {
  const onDone = vi.fn();
  const view = renderHook(() => useDialogControl(onDone, controlled));
  // The save of a form in the dialog, closing it on success.
  const submit = (answer: Promise<OperationResult<unknown>>) =>
    act(async () =>
      view.result.current.run(() => answer, {
        onSuccess: view.result.current.close,
        failCode: "collectionSaveFailed",
      }),
    );
  const open = () => act(() => view.result.current.handleOpenChange(true));
  const closed = (event = new Event("close", { cancelable: true })) => {
    act(() => view.result.current.handleCloseAutoFocus(event));
    return event;
  };
  return { onDone, submit, open, closed, ...view };
}

describe("useDialogControl", () => {
  it("opens and closes on its own state", () => {
    const { result, open } = setup();

    open();
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handleOpenChange(false));
    expect(result.current.isOpen).toBe(false);
  });

  // A refused close of the success would leave the form open, ready to be
  // sent a second time.
  it("holds Esc back while the request runs, and still closes on the success", async () => {
    const answer = Promise.withResolvers<OperationResult<unknown>>();
    const { result, open, submit } = setup();
    open();

    await submit(answer.promise);
    act(() => result.current.handleOpenChange(false));
    expect(result.current.isOpen).toBe(true);

    await act(async () => answer.resolve(ok()));
    expect(result.current.isOpen).toBe(false);
  });

  it("stays open on a failure, and tells nobody it is done", async () => {
    const { result, open, submit, closed, onDone } = setup();
    open();

    await submit(Promise.resolve(fail("collectionNotFound")));
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.handleOpenChange(false));
    closed();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("is done once, when the dialog has closed", async () => {
    const { open, submit, closed, onDone } = setup();
    open();
    await submit(Promise.resolve(ok()));
    expect(onDone).not.toHaveBeenCalled();

    expect(closed().defaultPrevented).toBe(false);
    closed();

    expect(onDone).toHaveBeenCalledOnce();
  });

  it("follows whoever opened it, and gives the focus back through them first", async () => {
    const steps: string[] = [];
    const controlled = {
      open: true,
      onOpenChange: vi.fn(),
      returnFocus: () => void steps.push("focus"),
    };
    const { result, submit, closed, onDone } = setup(controlled);
    onDone.mockImplementation(() => steps.push("done"));
    expect(result.current.isOpen).toBe(true);

    await submit(Promise.resolve(ok()));
    expect(controlled.onOpenChange).toHaveBeenCalledExactlyOnceWith(false);

    expect(closed().defaultPrevented).toBe(true);
    expect(steps).toEqual(["focus", "done"]);
  });
});
