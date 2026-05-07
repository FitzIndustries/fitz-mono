import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";

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

interface UseViewerOrganizationOptions {
  syncUrlSelection?: boolean;
}

export function useViewerOrganization(options?: UseViewerOrganizationOptions) {
  const sessionQuery = authClient.useSession();
  const session = sessionQuery.data;
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const requestedOrganizationSlug = search.org?.length ? search.org : null;
  const queryKey = ["viewer-organization", userId] as const;

  const organizationQuery = useQuery({
    queryKey,
    queryFn: () => apiFetch<ViewerOrganizationResponse>("/api/viewer"),
    enabled: Boolean(userId),
    staleTime: 30_000,
  });

  const setCurrentOrganization = useMutation({
    mutationFn: (organizationId: string) =>
      apiFetch<{ ok: true }>("/api/viewer/organization", {
        method: "POST",
        body: JSON.stringify({ organizationId }),
      }),
    onSuccess: async (_data, organizationId) => {
      const selectedOrganization = organizationQuery.data?.organizations.find(
        (item) => item.organizationId === organizationId,
      )?.organization;

      if (selectedOrganization) {
        await navigate({
          replace: true,
          to: ".",
          search: (prev) => ({ ...prev, org: selectedOrganization.slug }),
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ["organization-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["team-members"] }),
        queryClient.invalidateQueries({ queryKey: ["channel-settings"] }),
      ]);
    },
  });

  useEffect(() => {
    if (!options?.syncUrlSelection || !requestedOrganizationSlug) {
      return;
    }

    const viewer = organizationQuery.data;
    if (!viewer || setCurrentOrganization.isPending) {
      return;
    }

    if (viewer.currentOrganization?.slug === requestedOrganizationSlug) {
      return;
    }

    const requestedOrganization = viewer.organizations.find(
      (item) => item.organization?.slug === requestedOrganizationSlug,
    );

    if (!requestedOrganization) {
      return;
    }

    void setCurrentOrganization.mutateAsync(
      requestedOrganization.organizationId,
    );
  }, [
    options?.syncUrlSelection,
    organizationQuery.data,
    requestedOrganizationSlug,
    setCurrentOrganization,
  ]);

  return {
    session,
    isSessionPending: sessionQuery.isPending,
    ...organizationQuery,
    setCurrentOrganization,
    currentMembershipId: organizationQuery.data?.currentMembershipId ?? null,
    currentOrganization: organizationQuery.data?.currentOrganization ?? null,
    currentOrganizationId:
      organizationQuery.data?.currentOrganizationId ?? null,
    organizations: organizationQuery.data?.organizations ?? [],
  };
}
