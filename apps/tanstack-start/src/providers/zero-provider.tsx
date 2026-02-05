import type { ZeroOptions } from "@rocicorp/zero";
import { ZeroProvider as RocicorpZeroProvider } from "@rocicorp/zero/react";

import { mutators, schema } from "@fitzindustries/zero-shared";

import { env } from "~/env";

const opts: ZeroOptions = {
  userID: "anon",
  cacheURL: env.VITE_ZERO_CACHE_URL,
  schema,
  mutators,
};

function ZeroProvider({ children }: { children: React.ReactNode }) {
  return <RocicorpZeroProvider {...opts}>{children}</RocicorpZeroProvider>;
}

export { ZeroProvider };
