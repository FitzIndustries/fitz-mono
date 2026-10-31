import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { mutators, schema } from "@fitzindustries/zero-shared";
import { ZeroProvider as RocicorpZeroProvider } from "@fitzindustries/zero-shared/react";

import { authClient } from "~/lib/auth";
import { storageProvider } from "~/lib/storage";
import { trpc } from "~/utils/api";
import { getZeroCacheUrl } from "~/utils/base-url";

const cacheURL = getZeroCacheUrl();

export function ZeroProvider({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const viewerQuery = useQuery({
    ...trpc.organization.current.queryOptions(),
    enabled: Boolean(userId),
  });
  const viewer = viewerQuery.data;
  const userID = userId ?? "anon";

  // Memoize context so the reference is stable across renders.
  // The ZeroProvider's internal useEffect re-runs when props change by
  // reference — an unstable context causes an infinite create/destroy loop.
  const context = useMemo(() => {
    if (!userId || !viewer?.currentOrganizationId) {
      return undefined;
    }

    return {
      userId,
      organizationId: viewer.currentOrganizationId,
      membershipId: viewer.currentMembershipId,
    };
  }, [userId, viewer]);

  const [cookie, setCookie] = useState<string>();

  useEffect(() => {
    let isActive = true;

    const updateCookie = async () => {
      const nextCookie =
        Platform.OS === "web" ? undefined : await authClient.getCookie();
      if (isActive) {
        setCookie(nextCookie ?? undefined);
      }
    };

    void updateCookie();

    return () => {
      isActive = false;
    };
  }, [session.data]);

  return (
    <RocicorpZeroProvider
      schema={schema}
      userID={userID}
      context={context}
      storageKey={viewer?.currentOrganizationId ?? undefined}
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
