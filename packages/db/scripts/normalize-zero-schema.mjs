import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// drizzle-zero 0.21 emits a cross-package source import with no option to
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

const signaturePrefix = "// @generated drizzle-zero signature:sha256:";
const newlineIndex = source.indexOf("\n");
if (!source.startsWith(signaturePrefix) || newlineIndex === -1) {
  throw new Error("Generated schema signature changed; review normalization.");
}

const originalBody = source.slice(newlineIndex + 1);
const originalHash = createHash("sha256").update(originalBody).digest("hex");
if (source.slice(signaturePrefix.length, newlineIndex) !== originalHash) {
  throw new Error("Generated schema was modified before normalization.");
}

// Our import normalization is part of generation, not a manual edit. Refresh
// the generator's checksum so later runs still detect actual manual changes.
const body = originalBody.replace(sourceImport, packageImport);
const hash = createHash("sha256").update(body).digest("hex");
await writeFile(schemaFile, `${signaturePrefix}${hash}\n${body}`);
