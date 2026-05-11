import { createIsomorphicFn } from "@tanstack/react-start";

import { makeTRPCClient } from "~/lib/trpc";

export interface Viewer {
  currentMembershipId: string | null;
  currentOrganizationId: string | null;
  currentOrganization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  organizations: {
    membershipId: string;
    organizationId: string;
    role: "agent" | "owner" | "admin" | "viewer";
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }[];
}

type ViewerResult = Awaited<
  ReturnType<
    Awaited<
      ReturnType<typeof makeTRPCClient>
    >["organization"]["viewer"]["query"]
  >
>;

function toViewer(viewer: ViewerResult): Viewer {
  return {
    currentMembershipId: viewer.currentMembershipId,
    currentOrganizationId: viewer.currentOrganizationId,
    currentOrganization: viewer.currentOrganization
      ? {
          id: viewer.currentOrganization.id,
          name: viewer.currentOrganization.name,
          slug: viewer.currentOrganization.slug,
        }
      : null,
    organizations: viewer.organizations.map((membership) => ({
      membershipId: membership.membershipId,
      organizationId: membership.organizationId,
      role: membership.role,
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
    })),
  };
}

export const getViewer = createIsomorphicFn()
  .server(async (organizationSlug?: string) => {
    const trpc = makeTRPCClient();
    return toViewer(
      await trpc.organization.viewer.query({ org: organizationSlug }),
    );
  })
  .client(async (organizationSlug?: string) => {
    const trpc = makeTRPCClient();
    return toViewer(
      await trpc.organization.viewer.query({ org: organizationSlug }),
    );
  });
