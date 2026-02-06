import { spawn } from "node:child_process";
import process from "node:process";

const runZeroCacheDev = async (): Promise<void> => {
  const zeroUpstreamDb = process.env.POSTGRES_URL;

  if (!zeroUpstreamDb) {
    throw new Error("Missing POSTGRES_URL. Set it in .env.");
  }

  const child = spawn("pnpm", ["exec", "zero-cache-dev"], {
    stdio: "inherit",
    env: {
      ...process.env,
      ZERO_UPSTREAM_DB: zeroUpstreamDb,
      ZERO_QUERY_URL: "http://localhost:3001/api/zero/query",
      ZERO_MUTATE_URL: "http://localhost:3001/api/zero/mutate",
      ZERO_QUERY_FORWARD_COOKIES: "true",
      ZERO_MUTATE_FORWARD_COOKIES: "true",
    },
  });

  await new Promise<void>((resolve, reject) => {
    child.on("error", (error) => {
      reject(error instanceof Error ? error : new Error(String(error)));
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`zero-cache-dev exited with code ${code ?? "null"}`));
    });
  });
};

runZeroCacheDev().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
