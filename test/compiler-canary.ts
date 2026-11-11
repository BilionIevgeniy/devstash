import { useState } from "react";

// A hook with no useCallback. Under the React Compiler `increment` is the same
// function after a re-render; without it, a new one each time.
// `src/lib/react-compiler.test.tsx` checks that. It lives here and not in the
// test file because the dom project leaves `*.test.*` out of the Babel pass.
export function useCounter() {
  const [count, setCount] = useState(0);

  function increment() {
    setCount(count + 1);
  }

  return { count, increment };
}
