import babel from "@rolldown/plugin-babel";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";
import { sharedResolve } from "./vitest.shared.mjs";

// The extension decides the project: `.test.ts` runs in node, `.test.tsx`
// (components and hooks) in jsdom, `.stories.tsx` in Chromium. Only `resolve`
// is shared at the top, with the projects that extend it; the
// environment, the include globs and the plugins belong to one project each.
// `.int.test.ts` files need a database and have their own config,
// vitest.integration.config.mts, so `npm run test` and `test:watch` never run
// them.
export default defineConfig({
  resolve: sharedResolve,
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "**/*.int.test.ts"],
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
      {
        // Every story is a test (ADR 0026): it renders in Chromium (Vitest
        // Browser Mode, the Chromium of the e2e tests), runs its `play` steps,
        // and fails on an axe violation. Not `extends: true`: the stories
        // resolve modules through .storybook/main.ts alone, as `npm run
        // storybook` does, so a story cannot pass here on a stub (the empty
        // `server-only` of sharedResolve) and fail there.
        plugins: [storybookTest({ configDir: ".storybook" })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
