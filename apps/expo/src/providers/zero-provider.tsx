import type React from "react";
import { useMemo } from "react";
import { Platform } from "react-native";
import { ZeroProvider as RocicorpZeroProvider } from "@fitzindustries/zero-shared/react";

import { mutators, schema } from "@fitzindustries/zero-shared";

import { authClient } from "~/lib/auth";
import { storageProvider } from "~/lib/storage";
import { getZeroCacheUrl } from "~/utils/base-url";

const cacheURL = getZeroCacheUrl();

export function ZeroProvider({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const userID = session.data?.user.id ?? "anon";

  // Memoize context so the reference is stable across renders.
  // The ZeroProvider's internal useEffect re-runs when props change by
  // reference — an unstable context causes an infinite create/destroy loop.
  const context = useMemo(
    () => (session.data ? { userId: session.data.user.id } : undefined),
    [session.data],
  );

  const cookie = useMemo(() => {
    const ck = Platform.OS === "web" ? undefined : authClient.getCookie();
    return ck ?? undefined;
    // we force a re-render when the session changes, since getCookie is
    // not reactive
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  return (
    <RocicorpZeroProvider
      schema={schema}
      userID={userID}
      context={context}
      cacheURL={cacheURL}
      kvStore={storageProvider()}
      mutators={mutators}
      auth={cookie}
      logLevel="info"
    >
      {children}
    </RocicorpZeroProvider>
  );
}
