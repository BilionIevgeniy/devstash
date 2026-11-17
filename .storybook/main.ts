import { createRequire } from "node:module";

import babel from "@rolldown/plugin-babel";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";

const require = createRequire(import.meta.url);

// The framework swaps `react` for the copy that Next ships
// (next/dist/compiled/react) but names no `react/compiler-runtime`, which every
// compiled component imports: under Vitest its `react` alias then turns that
// path into one that does not exist, and in `storybook dev` the runtime would
// come from the other React. One exact alias to the same copy, from a plugin's
// `config` hook so it lands before the framework's.
const COMPILER_RUNTIME_ALIAS = [
  {
    find: /^react\/compiler-runtime$/,
    replacement:
      require.resolve("next/dist/compiled/react/compiler-runtime.js"),
  },
];

const compilerRuntimeOfNext = {
  name: "devstash:compiler-runtime-of-next",
  config: () => ({
    resolve: { alias: COMPILER_RUNTIME_ALIAS },
    test: { alias: COMPILER_RUNTIME_ALIAS },
  }),
};

// Storybook for the components with states that are hard to reach in the app
// (ADR 0026). The stories sit next to their component; `npm run test` runs each
// one as a test in Chromium, with the a11y check (the `storybook` project of
// vitest.config.mts).
const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../src/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-vitest"],
  core: { disableTelemetry: true },
  // The app builds with the React Compiler (`reactCompiler` in next.config.ts),
  // which the framework does not apply: the same pass as the `dom` project, so
  // a story renders the memoized code that ships. The stories themselves stay
  // out, like the test files there. The canary story checks it
  // (src/lib/react-compiler.stories.tsx).
  viteFinal: (viteConfig) => ({
    ...viteConfig,
    plugins: [
      ...(viteConfig.plugins ?? []),
      compilerRuntimeOfNext,
      babel({
        presets: [reactCompilerPreset()],
        exclude: [/[\\/]node_modules[\\/]/, /\.stories\.tsx$/],
      }),
    ],
  }),
};

export default config;
