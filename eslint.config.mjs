import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const APP = "./src/app";
const features = (...names) => names.map((name) => `./src/features/${name}`);

// Layer order, lowest to highest (see context/coding-standards.md):
// lib and components/ui < item-types and auth < items < collections < app-shell < app
const layerZones = [
  {
    target: ["./src/lib", "./src/components"],
    from: [
      ...features("auth", "item-types", "items", "collections", "app-shell"),
      APP,
    ],
    message: "lib and components/ui are the lowest layer and cannot import features or app.",
  },
  {
    target: features("item-types"),
    from: [...features("auth", "items", "collections", "app-shell"), APP],
    message: "item-types cannot import auth (same rank) or any higher layer.",
  },
  {
    target: features("auth"),
    from: [...features("item-types", "items", "collections", "app-shell"), APP],
    message: "auth cannot import item-types (same rank) or any higher layer.",
  },
  {
    target: features("items"),
    from: [...features("collections", "app-shell"), APP],
    message: "items cannot import a higher layer.",
  },
  {
    target: features("collections"),
    from: [...features("app-shell"), APP],
    message: "collections cannot import a higher layer.",
  },
  {
    target: features("app-shell"),
    from: [APP],
    message: "Features cannot import from app.",
  },
];

// The domain core is pure: it may only import other domain files, types.ts files
// and lib/utils. Packages are blocked separately with no-restricted-imports below.
// `except` globs are matched against absolute paths, unlike `target` and `from`.
const ROOT = process.cwd();

// Public API of a feature = everything outside its `_internal/` folder.
// Nothing outside the feature may import from `features/[name]/_internal`.
const FEATURE_NAMES = ["auth", "item-types", "items", "collections", "app-shell"];
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

const DOMAIN_FORBIDDEN_PACKAGES = [
  "react",
  "react/*",
  "react-dom",
  "react-dom/*",
  "next",
  "next/*",
  "next-auth",
  "next-auth/*",
  "@auth/*",
  "@prisma/*",
  "resend",
  "bcryptjs",
  "lucide-react",
  "node:*",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "import/no-restricted-paths": [
        "error",
        { zones: [...layerZones, ...internalZones, domainZone] },
      ],
      "import/no-cycle": ["error", { ignoreExternal: true }],
    },
  },
  {
    files: ["src/features/*/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: DOMAIN_FORBIDDEN_PACKAGES,
              message:
                "Domain files are pure: no framework, SDK or Node built-in imports.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/prisma",
              message:
                "Components do not touch Prisma: read data through the feature's queries.ts.",
            },
          ],
        },
      ],
    },
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
