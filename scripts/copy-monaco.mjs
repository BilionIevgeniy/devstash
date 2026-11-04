// Copies the installed Monaco build to public/, so the editor loads from the
// app's own origin. The version is in the path, so the files can be cached for
// good: next.config.ts builds the same path from package.json.
import { cp, readFile, rm } from "node:fs/promises";

const { version } = JSON.parse(
  await readFile("node_modules/monaco-editor/package.json", "utf8"),
);

await rm("public/monaco", { recursive: true, force: true });
await cp("node_modules/monaco-editor/min/vs", `public/monaco/${version}/vs`, {
  recursive: true,
});
