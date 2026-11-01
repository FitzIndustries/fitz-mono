import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

import { db } from "@fitzindustries/db/client";
import {
  getViewerOrganizations,
  requireViewerMembership,
} from "@fitzindustries/db/support";

import { auth } from "~/auth";

export const CURRENT_ORGANIZATION_COOKIE = "fitz-current-organization";

export async function getViewerState(c: Context) {
  return getViewerStateFromRequest(
    c.req.raw,
    getCookie(c, CURRENT_ORGANIZATION_COOKIE),
  );
}

export function persistCurrentOrganization(c: Context, organizationId: string) {
  setCookie(c, CURRENT_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "Lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function ensureViewerOrganization(c: Context) {
  const state = await getViewerState(c);

  if (!state?.viewer.currentOrganizationId) {
    return null;
  }

  persistCurrentOrganization(c, state.viewer.currentOrganizationId);
  return state;
}

export async function canAccessOrganization(
  userId: string,
  organizationId: string,
) {
  return requireViewerMembership(db, userId, organizationId);
}

export async function getViewerStateFromRequest(
  request: Request,
  preferredOrganizationId?: string | null,
) {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return null;
  }

  const viewer = await getViewerOrganizations(
    db,
    {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    preferredOrganizationId ??
      readOrganizationCookie(request.headers.get("cookie")),
  );

  return {
    session,
    viewer,
  };
}

function readOrganizationCookie(cookieHeader: string | null) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const matchingCookie = cookies.find((entry) =>
    entry.startsWith(`${CURRENT_ORGANIZATION_COOKIE}=`),
  );

  return matchingCookie?.slice(CURRENT_ORGANIZATION_COOKIE.length + 1) ?? null;
}
