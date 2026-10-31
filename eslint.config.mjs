import { readdirSync } from "node:fs";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const APP = "./src/app";

// Layer order, lowest to highest (see context/architecture-rules.md):
// lib and components/ui < features by rank < app.
// A feature may import only features of a lower rank; features of the same rank
// must not import each other. Only folders that exist are listed: a planned
// feature keeps its planned rank in architecture-rules.md and gets a row here in
// the commit that creates its folder.
const FEATURE_RANKS = {
  auth: 1,
  billing: 2,
  "item-types": 3,
  files: 3,
  editor: 3,
  items: 5,
  collections: 6,
  account: 8,
  "app-shell": 9,
};
const FEATURE_NAMES = Object.keys(FEATURE_RANKS);

const existingFeatures = readdirSync(new URL("./src/features", import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
const unlistedFeatures = existingFeatures.filter(
  (name) => !FEATURE_NAMES.includes(name),
);
const staleFeatures = FEATURE_NAMES.filter(
  (name) => !existingFeatures.includes(name),
);
if (unlistedFeatures.length > 0 || staleFeatures.length > 0) {
  throw new Error(
    "FEATURE_RANKS in eslint.config.mjs is out of sync with src/features " +
      `(no rank: ${unlistedFeatures.join(", ") || "none"}; ` +
      `no folder: ${staleFeatures.join(", ") || "none"})`,
  );
}

const features = (...names) => names.map((name) => `./src/features/${name}`);

// Every role folder of a feature exists twice: public and under _internal.
const roleFolders = (name, ...roles) =>
  roles.flatMap((role) => [
    `./src/features/${name}/${role}`,
    `./src/features/${name}/_internal/${role}`,
  ]);

const layerZones = [
  {
    target: ["./src/lib", "./src/components"],
    from: [...features(...FEATURE_NAMES), APP],
    message: "lib and components/ui are the lowest layer and cannot import features or app.",
  },
  ...FEATURE_NAMES.map((name) => ({
    target: features(name),
    from: [
      ...features(
        ...FEATURE_NAMES.filter(
          (other) =>
            other !== name && FEATURE_RANKS[other] >= FEATURE_RANKS[name],
        ),
      ),
      APP,
    ],
    message: `${name} (rank ${FEATURE_RANKS[name]}) cannot import a feature of the same or a higher rank, or app.`,
  })),
];

// Public API of a feature = everything outside its `_internal/` folder.
// Nothing outside the feature may import from `features/[name]/_internal`.
const internalZones = FEATURE_NAMES.map((name) => ({
  target: [
    APP,
    "./src/lib",
    "./src/components",
    "./src/proxy.ts",
    ...features(...FEATURE_NAMES.filter((other) => other !== name)),
  ],
  from: [`./src/features/${name}/_internal`],
  message: `${name}/_internal is private to the ${name} feature.`,
}));

// Roles inside a feature point one way: domain < schemas and queries < services
// < actions < components. A role may not import a role that sits above it.
const intraFeatureZones = FEATURE_NAMES.flatMap((name) => {
  const dir = `./src/features/${name}`;
  return [
    {
      target: [`${dir}/queries.ts`],
      from: roleFolders(name, "services", "actions", "components"),
      message: "queries.ts cannot import services, actions or components.",
    },
    {
      target: [`${dir}/schemas.ts`],
      from: [
        `${dir}/queries.ts`,
        ...roleFolders(name, "services", "actions", "components"),
      ],
      message: "schemas.ts cannot import queries, services, actions or components.",
    },
    {
      target: roleFolders(name, "services"),
      from: roleFolders(name, "actions", "components"),
      message: "services cannot import actions or components.",
    },
    {
      target: roleFolders(name, "actions"),
      from: roleFolders(name, "components"),
      message: "actions cannot import components.",
    },
    {
      target: roleFolders(name, "components"),
      from: roleFolders(name, "services"),
      message: "components cannot import services: read data through queries in a server component or call an action.",
    },
    {
      // A hook feeds components, so it points down to them, never up: a type
      // they share lives in the hook's file or types.ts (ADR 0007).
      target: roleFolders(name, "components/hooks"),
      from: ["./src/**/*.tsx"],
      message: "Hooks cannot import components (.tsx): a type they share lives in the hook's file or types.ts.",
    },
  ];
});

// The domain core is pure: it may only import other domain files, types.ts files
// and lib/utils. Packages are blocked separately with no-restricted-imports below.
// `except` globs are matched against absolute paths, unlike `target` and `from`.
const ROOT = process.cwd();

const domainZone = {
  target: "./src/features/*/domain/**/*",
  from: ["./src/**/*"],
  except: [
    `${ROOT}/src/features/*/domain/**/*`,
    `${ROOT}/src/features/*/types.ts`,
    `${ROOT}/src/lib/utils.{ts,tsx}`,
  ],
  message:
    "Domain files are pure: import only other domain files, types.ts and lib/utils.",
};

// Vendor SDKs are reached only through a client in src/lib.
const VENDOR_SDKS = {
  group: ["resend", "@upstash/*", "stripe", "openai", "@aws-sdk/*"],
  message: "Vendor SDKs are used only inside src/lib: call the client from there.",
};

const restrictImports = ({ paths = [], patterns = [] } = {}) => [
  "error",
  { paths, patterns: [...patterns, VENDOR_SDKS] },
];

const NO_PRISMA_MESSAGE =
  "Only queries.ts, services and lib touch Prisma: read through a query or call a service.";

// Size limits ("Size limits" in context/coding-standards.md), counted without
// blank lines and comments. UI code (components with their hooks, pages) gets
// 80 lines per function, since JSX is long but flat; every other role gets 50.
const SIZE_IGNORES = [
  "src/**/*.test.ts",
  "src/components/ui/**",
  "src/generated/**",
];
const maxFunctionLines = (max) => [
  "error",
  { max, skipBlankLines: true, skipComments: true, IIFEs: true },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // These rules rely on eslint-plugin-import, which declares ESLint up to
    // ^9: keep ESLint on 9 until it supports 10 (see "Known risks" in
    // docs/architecture.md).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            ...layerZones,
            ...internalZones,
            ...intraFeatureZones,
            domainZone,
          ],
        },
      ],
      "import/no-cycle": ["error", { ignoreExternal: true }],
    },
  },
  {
    // no-deprecated reads the @deprecated tags of the installed packages, so it
    // needs type information.
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: { "@typescript-eslint/no-deprecated": "error" },
  },
  // no-restricted-imports: a later block replaces an earlier one for the files
  // it matches, so every block repeats the vendor SDK ban through restrictImports.
  {
    files: ["src/features/**/*.{ts,tsx}", "src/app/**/*.{ts,tsx}", "src/proxy.ts"],
    rules: { "no-restricted-imports": restrictImports() },
  },
  {
    files: [
      "src/features/**/components/**/*.{ts,tsx}",
      "src/features/**/actions/**/*.{ts,tsx}",
      "src/components/common/**/*.{ts,tsx}",
      "src/app/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": restrictImports({
        paths: [{ name: "@/lib/prisma", message: NO_PRISMA_MESSAGE }],
        patterns: [
          {
            group: ["@/generated/prisma", "@/generated/prisma/*"],
            message: NO_PRISMA_MESSAGE,
          },
        ],
      }),
    },
  },
  {
    files: ["src/features/**/services/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": restrictImports({
        paths: ["next/headers", "next/cache", "next/navigation"].map((name) => ({
          name,
          message:
            "Services take userId, ip and origin as parameters: read the request in the action, route or page.",
        })),
      }),
    },
  },
  {
    // Allowlist: a domain file imports no package at all (react, zod, node:*,
    // SDKs...). Relative and "@/" imports are checked by domainZone above.
    // Colocated tests are not domain code and import vitest; they keep the
    // vendor SDK ban from the features block.
    files: ["src/features/*/domain/**/*.{ts,tsx}"],
    ignores: ["src/features/*/domain/**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(?!\\.{1,2}/|@/).",
              message:
                "Domain files are pure: no package imports (framework, zod, SDK or node:*).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: SIZE_IGNORES,
    rules: {
      "max-lines-per-function": maxFunctionLines(50),
      "max-lines": [
        "error",
        { max: 250, skipBlankLines: true, skipComments: true },
      ],
      complexity: ["error", 15],
    },
  },
  {
    // Browser helpers in components/ (put-file, fetch-item-detail) are plain
    // functions and keep the 50 lines of the logic roles.
    files: [
      "src/features/**/components/**/*.tsx",
      "src/features/**/components/hooks/use-*.ts",
      "src/components/common/**/*.{ts,tsx}",
      "src/app/**/*.tsx",
    ],
    ignores: SIZE_IGNORES,
    rules: { "max-lines-per-function": maxFunctionLines(80) },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
