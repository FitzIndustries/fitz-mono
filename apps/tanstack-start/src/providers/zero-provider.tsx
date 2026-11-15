import { createContext, useContext, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

import {
  mutators,
  schema,
  ZERO_ORGANIZATION_HEADER,
} from "@fitzindustries/zero-shared";
import { ZeroProvider as RocicorpZeroProvider } from "@fitzindustries/zero-shared/react";

import { authClient } from "~/auth/client";
import { env } from "~/env";
import { getViewer } from "~/lib/viewer";

const ZeroReadyContext = createContext(false);

export function useIsZeroReady() {
  return useContext(ZeroReadyContext);
}

function ZeroProvider({ children }: { children: React.ReactNode }) {
  const sessionQuery = authClient.useSession();
  const session = sessionQuery.data;
  const userId = session?.user.id;
  const organizationSlug = useSearch({
    strict: false,
    select: (search) => search.org,
  });
  const viewerQuery = useQuery({
    queryKey: ["zero-viewer", userId, organizationSlug],
    queryFn: () => getViewer(organizationSlug),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const viewer = viewerQuery.data;

  if (
    typeof window === "undefined" ||
    !userId ||
    !viewer?.currentOrganizationId
  ) {
    return children;
  }

  return (
    <ActiveZeroProvider
      key={`${userId}:${viewer.currentOrganizationId}:${viewer.currentMembershipId ?? "none"}`}
      userId={userId}
      organizationId={viewer.currentOrganizationId}
      membershipId={viewer.currentMembershipId}
    >
      {children}
    </ActiveZeroProvider>
  );
}

function ActiveZeroProvider({
  children,
  userId,
  organizationId,
  membershipId,
}: {
  children: React.ReactNode;
  userId: string;
  organizationId: string;
  membershipId: string | null;
}) {
  const context = useMemo(
    () => ({ userId, organizationId, membershipId }),
    [userId, organizationId, membershipId],
  );
  const headers = useMemo(
    () => ({ [ZERO_ORGANIZATION_HEADER]: organizationId }),
    [organizationId],
  );
  return (
    <ZeroReadyContext value={true}>
      <RocicorpZeroProvider
        cacheURL={env.VITE_ZERO_CACHE_URL}
        userID={userId}
        storageKey={organizationId}
        schema={schema}
        mutators={mutators}
        logLevel={env.VITE_PUBLIC_ZERO_LOG_LEVEL}
        context={context}
        queryHeaders={headers}
        mutateHeaders={headers}
      >
        {children}
      </RocicorpZeroProvider>
    </ZeroReadyContext>
  );
}

export { ZeroProvider };
