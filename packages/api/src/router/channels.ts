import { createCipheriv, randomBytes } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import type { db as databaseClient } from "@fitzindustries/db/client";
import { and, eq } from "@fitzindustries/db";
import {
  emailChannel,
  organizationMember,
  whatsappChannel,
} from "@fitzindustries/db/schema";

import { protectedProcedure } from "../trpc";

export const channelsRouter = {
  upsertEmail: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(100),
        emailAddress: z.string().email(),
        fromName: z.string().min(1).max(100),
        awsSesArn: z.string().optional().nullable(),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageChannels(ctx, input.organizationId);

      const existingChannel = await ctx.db.query.emailChannel.findFirst({
        where: eq(emailChannel.organizationId, input.organizationId),
      });
      const values = {
        organizationId: input.organizationId,
        name: input.name,
        emailAddress: input.emailAddress,
        fromName: input.fromName,
        awsSesArn: input.awsSesArn ?? null,
        awsSesVerified: !!input.awsSesArn,
        isActive: input.isActive,
        updatedAt: new Date(),
      };

      const [channel] = existingChannel
        ? await ctx.db
            .update(emailChannel)
            .set(values)
            .where(eq(emailChannel.id, existingChannel.id))
            .returning()
        : await ctx.db
            .insert(emailChannel)
            .values({ id: crypto.randomUUID(), ...values })
            .returning();

      return { channel };
    }),

  upsertWhatsapp: protectedProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(100),
        phoneNumber: z.string().min(1).max(20),
        phoneNumberId: z.string().min(1).max(100),
        accessToken: z.string().min(1).optional(),
        webhookVerifyToken: z.string().min(1).max(255),
        isActive: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanManageChannels(ctx, input.organizationId);

      if (!ctx.encryptionKey) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Channel encryption is not configured",
        });
      }

      const existingChannel = await ctx.db.query.whatsappChannel.findFirst({
        where: eq(whatsappChannel.organizationId, input.organizationId),
      });
      const accessTokenEncrypted = input.accessToken
        ? encryptChannelSecret(ctx.encryptionKey, input.accessToken)
        : (existingChannel?.accessTokenEncrypted ?? "");

      if (!accessTokenEncrypted) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Access token is required",
        });
      }

      const values = {
        organizationId: input.organizationId,
        name: input.name,
        phoneNumber: input.phoneNumber,
        phoneNumberId: input.phoneNumberId,
        accessTokenEncrypted,
        webhookVerifyToken: input.webhookVerifyToken,
        isActive: input.isActive,
        updatedAt: new Date(),
      };

      const [channel] = existingChannel
        ? await ctx.db
            .update(whatsappChannel)
            .set(values)
            .where(eq(whatsappChannel.id, existingChannel.id))
            .returning()
        : await ctx.db
            .insert(whatsappChannel)
            .values({ id: crypto.randomUUID(), ...values })
            .returning();

      return {
        channel: channel
          ? {
              id: channel.id,
              name: channel.name,
              phoneNumber: channel.phoneNumber,
              phoneNumberId: channel.phoneNumberId,
              webhookVerifyToken: channel.webhookVerifyToken,
              isActive: channel.isActive,
            }
          : null,
      };
    }),
} satisfies TRPCRouterRecord;

async function assertCanManageChannels(
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

function encryptChannelSecret(encryptionKey: string, value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey, "hex"),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([iv, encrypted]).toString("base64");
}
