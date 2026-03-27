import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { authClient } from "~/auth/client";
import { apiFetch } from "~/lib/api";

interface ViewerOrganizationResponse {
  currentMembershipId: string | null;
  currentOrganizationId: string | null;
  currentOrganization: {
    id: string;
    name: string;
    slug: string;
    plan: string | null;
  } | null;
  organizations: {
    membershipId: string;
    organizationId: string;
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
      plan: string | null;
    } | null;
  }[];
}

export function useViewerOrganization() {
  const sessionState = authClient.useSession();
  const queryClient = useQueryClient();
  const queryKey = ["viewer-organization", sessionState.data?.user.id] as const;

  const organizationQuery = useQuery({
    enabled: !!sessionState.data?.user.id,
    queryKey,
    queryFn: () => apiFetch<ViewerOrganizationResponse>("/api/viewer"),
    staleTime: 30_000,
  });

  const setCurrentOrganization = useMutation({
    mutationFn: (organizationId: string) =>
      apiFetch<{ ok: true }>("/api/viewer/organization", {
        method: "POST",
        body: JSON.stringify({ organizationId }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["organization-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["team-members"] }),
        queryClient.invalidateQueries({ queryKey: ["channel-settings"] }),
      ]);
    },
  });

  return {
    session: sessionState.data,
    isSessionPending: sessionState.isPending,
    ...organizationQuery,
    setCurrentOrganization,
    currentMembershipId: organizationQuery.data?.currentMembershipId ?? null,
    currentOrganization: organizationQuery.data?.currentOrganization ?? null,
    currentOrganizationId:
      organizationQuery.data?.currentOrganizationId ?? null,
    organizations: organizationQuery.data?.organizations ?? [],
  };
}
