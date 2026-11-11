import { renderHook } from "@testing-library/react";
import { expect, it } from "vitest";

import { useCounter } from "../../test/compiler-canary";

// The app builds with the React Compiler (`reactCompiler` in next.config.ts)
// and the dom project runs through it too (vitest.config.mts), so a component
// test sees the code that ships. This fails when a plugin bump or a config
// change stops that, before the other component tests quietly test something
// else.
it("runs the code under test through the React Compiler", () => {
  const { result, rerender } = renderHook(() => useCounter());
  const { increment } = result.current;

  rerender();

  expect(result.current.increment).toBe(increment);
});
