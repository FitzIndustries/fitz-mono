import type { TRPCRouterRecord } from "@trpc/server";
import { z } from "zod/v4";

import { getViewerOrganizations } from "@fitzindustries/db/support";

import { protectedProcedure } from "../trpc";

export const organizationRouter = {
  viewer: protectedProcedure
    .input(
      z
        .object({
          org: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const viewer = await getViewerOrganizations(ctx.db, {
        id: ctx.session.user.id,
        name: ctx.session.user.name,
        email: ctx.session.user.email,
      });
      const requestedOrganization = input?.org
        ? viewer.organizations.find(
            (membership) =>
              membership.organizationId === input.org ||
              membership.organization.slug === input.org,
          )
        : null;

      if (!requestedOrganization) {
        return viewer;
      }

      return getViewerOrganizations(
        ctx.db,
        {
          id: ctx.session.user.id,
          name: ctx.session.user.name,
          email: ctx.session.user.email,
        },
        requestedOrganization.organizationId,
      );
    }),
  current: protectedProcedure.query(async ({ ctx }) => {
    return getViewerOrganizations(ctx.db, {
      id: ctx.session.user.id,
      name: ctx.session.user.name,
      email: ctx.session.user.email,
    });
  }),
} satisfies TRPCRouterRecord;
