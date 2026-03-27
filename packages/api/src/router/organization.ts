import type { TRPCRouterRecord } from "@trpc/server";

import { getViewerOrganizations } from "@fitzindustries/db/support";

import { protectedProcedure } from "../trpc";

export const organizationRouter = {
  viewer: protectedProcedure.query(async ({ ctx }) => {
    return getViewerOrganizations(ctx.db, {
      id: ctx.session.user.id,
      name: ctx.session.user.name,
      email: ctx.session.user.email,
    });
  }),
} satisfies TRPCRouterRecord;
