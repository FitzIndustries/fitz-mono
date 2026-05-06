import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zero } from "@rocicorp/zero";

import type { ZeroContext } from "@fitzindustries/zero-shared";
import { schema } from "@fitzindustries/zero-shared";
import { ZeroProvider as RocicorpZeroProvider } from "@fitzindustries/zero-shared/react";

import { authClient } from "~/auth/client";
import { env } from "~/env";
import { getViewer } from "~/lib/viewer";

type AppZero = Zero<typeof schema, undefined, ZeroContext>;

function ZeroProvider({ children }: { children: React.ReactNode }) {
  const sessionQuery = authClient.useSession();
  const session = sessionQuery.data;
  const userId = session?.user.id;
  const viewerQuery = useQuery({
    queryKey: ["zero-viewer", userId],
    queryFn: () => getViewer(),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });
  const viewer = viewerQuery.data;

  if (typeof window === "undefined" || !userId || !viewer?.currentOrganizationId) {
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
  const [zero] = useState<AppZero>(() => {
    return new Zero({
      cacheURL: env.VITE_ZERO_CACHE_URL,
      userID: userId,
      storageKey: organizationId,
      schema,
      queryURL: `${env.VITE_API_URL}/api/zero/query`,
      mutateURL: `${env.VITE_API_URL}/api/zero/mutate`,
      logLevel: env.VITE_PUBLIC_ZERO_LOG_LEVEL,
      context: {
        userId,
        organizationId,
        membershipId,
      },
    });
  });

  useEffect(() => {
    return () => {
      void zero.close();
    };
  }, [zero]);

  return <RocicorpZeroProvider zero={zero}>{children}</RocicorpZeroProvider>;
}

export { ZeroProvider };
