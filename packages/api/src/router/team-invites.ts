import { createHash, randomBytes } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { db as databaseClient } from "@fitzindustries/db/client";
import { and, desc, eq } from "@fitzindustries/db";
import {
  organization,
  organizationInvite,
  organizationMember,
  user,
} from "@fitzindustries/db/schema";
import { sendTeamInviteEmail } from "@fitzindustries/email";

import { protectedProcedure, publicProcedure } from "../trpc";

const inviteRoleSchema = z.enum(["admin", "agent", "viewer"]);

export const teamInvitesRouter = {
  preview: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const invite = await ctx.db.query.organizationInvite.findFirst({
        where: and(
          eq(organizationInvite.tokenHash, hashInviteToken(input.token)),
          eq(organizationInvite.status, "pending"),
        ),
        with: { organization: true },
      });

      if (!invite || invite.expiresAt <= new Date()) {
        return { invite: null };
      }

      return {
        invite: {
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
          organizationName: invite.organization.name,
          organizationSlug: invite.organization.slug,
        },
      };
    }),

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

      const inviteLink = `${ctx.appUrl ?? "http://localhost:3000"}/accept-invite?token=${encodeURIComponent(token)}`;
      const emailDeliveryStatus = await sendInviteEmail({
        database: ctx.db,
        from: ctx.platformEmailFrom,
        inviteLink,
        organizationId: input.organizationId,
        resendApiKey: ctx.resendApiKey,
        to: email,
      });

      return {
        invite: {
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expiresAt: invite.expiresAt,
        },
        emailDeliveryStatus,
        emailSent: emailDeliveryStatus === "sent",
        inviteLink,
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

  accept: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const invite = await ctx.db.query.organizationInvite.findFirst({
        where: and(
          eq(organizationInvite.tokenHash, hashInviteToken(input.token)),
          eq(organizationInvite.status, "pending"),
        ),
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      if (invite.expiresAt <= new Date()) {
        await ctx.db
          .update(organizationInvite)
          .set({ status: "expired", updatedAt: new Date() })
          .where(eq(organizationInvite.id, invite.id));

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      if (ctx.session.user.email?.toLowerCase() !== invite.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Sign in with the email address this invite was sent to",
        });
      }

      const existingMembership =
        await ctx.db.query.organizationMember.findFirst({
          where: and(
            eq(organizationMember.userId, ctx.session.user.id),
            eq(organizationMember.organizationId, invite.organizationId),
          ),
        });

      if (existingMembership) {
        await ctx.db
          .update(organizationMember)
          .set({
            role: invite.role,
            invitedBy: invite.invitedBy,
            isActive: true,
            joinedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(organizationMember.id, existingMembership.id));
      } else {
        await ctx.db.insert(organizationMember).values({
          id: crypto.randomUUID(),
          userId: ctx.session.user.id,
          organizationId: invite.organizationId,
          role: invite.role,
          invitedBy: invite.invitedBy,
          isActive: true,
        });
      }

      await ctx.db
        .update(organizationInvite)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedBy: ctx.session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(organizationInvite.id, invite.id));

      const acceptedOrganization = await ctx.db.query.organization.findFirst({
        where: eq(organization.id, invite.organizationId),
      });

      return {
        organizationSlug: acceptedOrganization?.slug ?? null,
      };
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

async function sendInviteEmail({
  database,
  from,
  inviteLink,
  organizationId,
  resendApiKey,
  to,
}: {
  database: typeof databaseClient;
  from?: string;
  inviteLink: string;
  organizationId: string;
  resendApiKey?: string;
  to: string;
}): Promise<"failed" | "not_configured" | "sent"> {
  if (!resendApiKey || !from) {
    return "not_configured";
  }

  const organizationRecord = await database.query.organization.findFirst({
    where: eq(organization.id, organizationId),
  });
  const organizationName = organizationRecord?.name ?? "your organization";

  try {
    await sendTeamInviteEmail({
      apiKey: resendApiKey,
      from,
      inviteLink,
      organizationName,
      to,
    });

    return "sent";
  } catch (error) {
    console.error("Failed to send invite email", error);
    return "failed";
  }
}
