// A successful HTTP status is required; redirects and error pages are not ready.
const checks = [
  ["hono", "http://127.0.0.1:3100/health"],
  ["web", "http://127.0.0.1:3000/login"],
  ["zero", "http://127.0.0.1:4848/keepalive"],
];
await Promise.all(
  checks.map(async ([name, url]) => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      redirect: "manual",
    });
    if (response.status !== 200) throw new Error(`${name} not ready`);
    if (name === "hono" && (await response.json()).status !== "ok") {
      throw new Error("Invalid Hono health body");
    }
    if (!response.bodyUsed) await response.body?.cancel();
    console.log(`${name}: HTTP 200 ready`);
  }),
);
