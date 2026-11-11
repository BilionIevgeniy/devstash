import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The extension decides the project: `.test.ts` runs in node, `.test.tsx`
// (components and hooks) in jsdom. Only `resolve` is shared at the top; the
// environment, the include globs and the plugins belong to one project each.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(
        new URL("./test/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
        },
      },
      {
        // Component and hook tests go through the React Compiler like the app
        // does (`reactCompiler` in next.config.ts). The tests themselves stay
        // out of the Babel pass.
        extends: true,
        plugins: [
          react(),
          babel({
            presets: [reactCompilerPreset()],
            exclude: [/[\\/]node_modules[\\/]/, /\.test\.[jt]sx?$/],
          }),
        ],
        test: {
          name: "dom",
          environment: "jsdom",
          // Queued answers (`mockReturnValueOnce`) survive `clearAllMocks`; a
          // test that fails early would hand its leftovers to the next one.
          mockReset: true,
          include: ["src/**/*.test.tsx"],
          setupFiles: ["./test/dom-setup.ts"],
        },
      },
    ],
  },
});
