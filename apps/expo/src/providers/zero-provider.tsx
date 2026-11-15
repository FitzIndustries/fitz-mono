import type React from "react";
import { useMemo } from "react";
import { Platform } from "react-native";
import { useQuery } from "@tanstack/react-query";

import {
  mutators,
  schema,
  ZERO_ORGANIZATION_HEADER,
} from "@fitzindustries/zero-shared";
import { ZeroProvider as RocicorpZeroProvider } from "@fitzindustries/zero-shared/react";

import { authClient } from "~/lib/auth";
import { storageProvider } from "~/lib/storage";
import { trpcClient } from "~/utils/api";
import { getZeroCacheUrl } from "~/utils/base-url";

const cacheURL = getZeroCacheUrl();

export function ZeroProvider({ children }: { children: React.ReactNode }) {
  const session = authClient.useSession();
  const userId = session.data?.user.id;
  const sessionId = session.data?.session.id;
  const viewerQuery = useQuery({
    queryKey: ["zero-viewer", userId, sessionId],
    queryFn: () => trpcClient.organization.current.query(),
    enabled: Boolean(userId),
  });
  const viewer = viewerQuery.data;
  const cookieQuery = useQuery({
    queryKey: ["zero-cookie", userId, sessionId],
    queryFn: () => authClient.getCookie(),
    enabled: Platform.OS !== "web" && Boolean(userId),
  });
  const cookie = Platform.OS === "web" ? undefined : cookieQuery.data;
  const context = useMemo(() => {
    if (
      !userId ||
      !viewer?.currentOrganizationId ||
      (Platform.OS !== "web" && !cookie)
    ) {
      return undefined;
    }
    return {
      userId,
      organizationId: viewer.currentOrganizationId,
      membershipId: viewer.currentMembershipId,
    };
  }, [userId, viewer, cookie]);
  const headers = useMemo(
    () =>
      context
        ? {
            [ZERO_ORGANIZATION_HEADER]: context.organizationId,
            ...(cookie ? { Cookie: cookie } : {}),
          }
        : undefined,
    [context, cookie],
  );
  // Factory identity must remain stable across ordinary renders.
  const kvStore = useMemo(() => storageProvider(), []);

  return (
    <RocicorpZeroProvider
      key={
        context
          ? `${context.userId}:${context.organizationId}:${context.membershipId ?? "none"}`
          : "anonymous"
      }
      schema={schema}
      userID={context?.userId}
      context={context}
      storageKey={context?.organizationId}
      cacheURL={cacheURL}
      kvStore={kvStore}
      mutators={mutators}
      queryHeaders={headers}
      mutateHeaders={headers}
      logLevel="info"
    >
      {children}
    </RocicorpZeroProvider>
  );
}
