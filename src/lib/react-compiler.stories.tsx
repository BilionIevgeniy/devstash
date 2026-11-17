import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { useCounter } from "../../test/compiler-canary";

// The stories run through the React Compiler like the app (.storybook/main.ts
// adds the pass, since the framework does not). This fails when a bump of the
// framework or of a plugin stops that. The twin of
// src/lib/react-compiler.test.tsx for the `dom` project: the probe re-renders
// with the counter unchanged, and under the compiler `increment` stays the
// same function. The probe itself is not compiled (stories stay out of the
// pass), only the hook it calls.
function CompilerProbe() {
  const { increment } = useCounter();
  const [first] = useState(() => increment);
  const [renders, setRenders] = useState(1);
  return (
    <button type="button" onClick={() => setRenders(renders + 1)}>
      {`${renders} ${first === increment ? "stable" : "new"}`}
    </button>
  );
}

const meta = {
  title: "Internal/React Compiler canary",
  component: CompilerProbe,
  tags: ["!dev"],
} satisfies Meta<typeof CompilerProbe>;

export default meta;

export const KeepsCallbacksStable: StoryObj<typeof meta> = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await userEvent.click(button);
    await expect(button).toHaveTextContent("2 stable");
  },
};
