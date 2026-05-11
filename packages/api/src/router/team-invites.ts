import { createHash, randomBytes } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { db as databaseClient } from "@fitzindustries/db/client";
import { and, desc, eq } from "@fitzindustries/db";
import {
  organizationInvite,
  organizationMember,
  user,
} from "@fitzindustries/db/schema";

import { protectedProcedure } from "../trpc";

const inviteRoleSchema = z.enum(["admin", "agent", "viewer"]);

export const teamInvitesRouter = {
  pending: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertCanManageTeam(ctx, input.organizationId);

      const invites = await ctx.db.query.organizationInvite.findMany({
        where: and(
          eq(organizationInvite.organizationId, input.organizationId),
          eq(organizationInvite.status, "pending"),
        ),
        orderBy: desc(organizationInvite.createdAt),
      });

      return {
        invites: invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        })),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        email: z.string().email().max(255),
        role: inviteRoleSchema.default("agent"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageTeam(ctx, input.organizationId);

      const email = input.email.trim().toLowerCase();
      const existingUser = await ctx.db.query.user.findFirst({
        where: eq(user.email, email),
      });

      if (existingUser) {
        const existingMember = await ctx.db.query.organizationMember.findFirst({
          where: and(
            eq(organizationMember.userId, existingUser.id),
            eq(organizationMember.organizationId, input.organizationId),
            eq(organizationMember.isActive, true),
          ),
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "That user is already a member of this organization",
          });
        }
      }

      const token = randomBytes(32).toString("base64url");
      const tokenHash = hashInviteToken(token);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const existingInvite = await ctx.db.query.organizationInvite.findFirst({
        where: and(
          eq(organizationInvite.organizationId, input.organizationId),
          eq(organizationInvite.email, email),
          eq(organizationInvite.status, "pending"),
        ),
      });

      const values = {
        organizationId: input.organizationId,
        email,
        role: input.role,
        tokenHash,
        invitedBy: ctx.session.user.id,
        status: "pending" as const,
        expiresAt,
        updatedAt: new Date(),
      };
      const [invite] = existingInvite
        ? await ctx.db
            .update(organizationInvite)
            .set(values)
            .where(eq(organizationInvite.id, existingInvite.id))
            .returning()
        : await ctx.db
            .insert(organizationInvite)
            .values({ id: crypto.randomUUID(), ...values })
            .returning();

      if (!invite) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to create invite",
        });
      }

      return {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
        },
        token,
      };
    }),

  revoke: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        inviteId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageTeam(ctx, input.organizationId);

      const existingInvite = await ctx.db.query.organizationInvite.findFirst({
        where: and(
          eq(organizationInvite.id, input.inviteId),
          eq(organizationInvite.organizationId, input.organizationId),
          eq(organizationInvite.status, "pending"),
        ),
      });

      if (!existingInvite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pending invite not found",
        });
      }

      await ctx.db
        .update(organizationInvite)
        .set({ status: "revoked", updatedAt: new Date() })
        .where(eq(organizationInvite.id, input.inviteId));

      return { id: input.inviteId };
    }),
} satisfies TRPCRouterRecord;

async function assertCanManageTeam(
  ctx: {
    db: typeof databaseClient;
    session: { user: { id: string } };
  },
  organizationId: string,
) {
  const membership = await ctx.db.query.organizationMember.findFirst({
    where: and(
      eq(organizationMember.userId, ctx.session.user.id),
      eq(organizationMember.organizationId, organizationId),
      eq(organizationMember.isActive, true),
    ),
  });

  if (membership?.role !== "owner" && membership?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
