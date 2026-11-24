// `after` for a service test: the tasks wait until the test runs them, so it
// can look at what happened before the answer and after it.
export function deferredTasks() {
  const tasks: (() => Promise<void>)[] = [];
  return {
    defer: (task: () => Promise<void>) => void tasks.push(task),
    count: () => tasks.length,
    /** What the platform does once the answer is sent. */
    run: async () => {
      for (const task of tasks.splice(0)) await task();
    },
  };
}
