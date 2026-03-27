import { and, eq } from "drizzle-orm";

import type { db as databaseClient } from "./client";
import { organization, organizationMember } from "./schema";

type Database = typeof databaseClient;

interface ViewerUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "support";
}

async function generateOrganizationSlug(database: Database, user: ViewerUser) {
  const baseName = user.name?.trim() ?? user.email?.split("@")[0] ?? "support";
  const baseSlug = `${slugify(baseName)}-support`;

  let attempt = 0;
  while (attempt < 10) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const slug = `${baseSlug}${suffix}`;
    const existing = await database.query.organization.findFirst({
      where: eq(organization.slug, slug),
    });

    if (!existing) {
      return slug;
    }

    attempt += 1;
  }

  return `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
}

async function createDefaultOrganization(database: Database, user: ViewerUser) {
  const organizationId = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const orgName = user.name?.trim()
    ? `${user.name.trim()} Support`
    : "Support Workspace";
  const slug = await generateOrganizationSlug(database, user);

  await database.insert(organization).values({
    id: organizationId,
    name: orgName,
    slug,
    settings: {},
    isActive: true,
  });

  await database.insert(organizationMember).values({
    id: membershipId,
    userId: user.id,
    organizationId,
    role: "owner",
    isActive: true,
  });
}

async function getMemberships(database: Database, userId: string) {
  return database.query.organizationMember.findMany({
    where: and(
      eq(organizationMember.userId, userId),
      eq(organizationMember.isActive, true),
    ),
    with: {
      organization: true,
    },
  });
}

type ViewerMembership = Awaited<ReturnType<typeof getMemberships>>[number];

function serializeMembership(membership: ViewerMembership) {
  return {
    membershipId: membership.id,
    organizationId: membership.organizationId,
    role: membership.role,
    organization: membership.organization,
  };
}

export async function getViewerOrganizations(
  database: Database,
  user: ViewerUser,
  preferredOrganizationId?: string | null,
) {
  let memberships = await getMemberships(database, user.id);

  if (memberships.length === 0) {
    await createDefaultOrganization(database, user);
    memberships = await getMemberships(database, user.id);
  }

  const activeMembership =
    memberships.find(
      (membership) =>
        membership.organizationId === preferredOrganizationId &&
        membership.organization.isActive,
    ) ??
    memberships.find((membership) => membership.organization.isActive) ??
    memberships[0] ??
    null;

  return {
    currentMembershipId: activeMembership?.id ?? null,
    currentOrganizationId: activeMembership?.organizationId ?? null,
    currentOrganization: activeMembership?.organization ?? null,
    organizations: memberships.map(serializeMembership),
  };
}

export async function requireViewerMembership(
  database: Database,
  userId: string,
  organizationId: string,
) {
  return database.query.organizationMember.findFirst({
    where: and(
      eq(organizationMember.userId, userId),
      eq(organizationMember.organizationId, organizationId),
      eq(organizationMember.isActive, true),
    ),
    with: {
      organization: true,
    },
  });
}
