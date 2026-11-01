import { readFile, writeFile } from "node:fs/promises";

// drizzle-zero 0.17 emits a cross-package source import with no option to
// customize it. Resolve custom column types through the DB declaration export
// instead, so Zero Shared does not compile DB source outside its rootDir.
const schemaFile = new URL("../../zero-shared/src/schema.ts", import.meta.url);
const source = await readFile(schemaFile, "utf8");
const sourceImport =
  'import type * as drizzleSchema from "../../db/src/schema";';
const packageImport =
  'import type * as drizzleSchema from "@fitzindustries/db/schema";';

if (!source.includes(sourceImport)) {
  throw new Error(
    "Generated Drizzle schema import changed; review the Zero schema normalization step.",
  );
}

await writeFile(schemaFile, source.replace(sourceImport, packageImport));
