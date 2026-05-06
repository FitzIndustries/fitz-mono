import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { env } from "~/env";
import { apiFetch } from "~/lib/api";

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

export const getViewer = createIsomorphicFn()
  .server(async (organizationSlug?: string) => {
    const requestHeaders = new Headers(getRequestHeaders());
    const cookie = requestHeaders.get("cookie");
    const searchParams = new URLSearchParams();

    if (organizationSlug) {
      searchParams.set("org", organizationSlug);
    }

    const queryString = searchParams.toString();

    const response = await fetch(`${env.VITE_API_URL}/api/viewer${queryString ? `?${queryString}` : ""}`, {
      headers: cookie ? { cookie } : undefined,
    });

    if (response.status === 401) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Viewer request failed: ${String(response.status)}`);
    }

    return response.json() as Promise<Viewer>;
  })
  .client(async (organizationSlug?: string) => {
    const searchParams = new URLSearchParams();

    if (organizationSlug) {
      searchParams.set("org", organizationSlug);
    }

    const queryString = searchParams.toString();

    return apiFetch<Viewer>(`/api/viewer${queryString ? `?${queryString}` : ""}`);
  });
