import { createDecipheriv } from "node:crypto";
import type { TRPCRouterRecord } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";

import { and, eq } from "@fitzindustries/db";
import { db } from "@fitzindustries/db/client";
import {
  conversation,
  emailChannel,
  message,
  organizationMember,
  whatsappChannel,
} from "@fitzindustries/db/schema";

import { protectedProcedure } from "../trpc";

interface ConversationWithCustomer {
  id: string;
  organizationId: string;
  channel: "email" | "whatsapp";
  channelId: string | null;
  subject: string | null;
  customer?: {
    email: string | null;
    phone: string | null;
  } | null;
}

export const supportRouter = {
  sendReply: protectedProcedure
    .input(
      z.object({
        conversationId: z.string().uuid(),
        content: z.string().trim().min(1).max(10_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingConversation = await ctx.db.query.conversation.findFirst({
        where: eq(conversation.id, input.conversationId),
        with: { customer: true },
      });

      if (!existingConversation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      const membership = await ctx.db.query.organizationMember.findFirst({
        where: and(
          eq(organizationMember.userId, ctx.session.user.id),
          eq(
            organizationMember.organizationId,
            existingConversation.organizationId,
          ),
          eq(organizationMember.isActive, true),
        ),
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const providerMessageId = await sendProviderMessage({
        content: input.content,
        conversation: existingConversation,
        encryptionKey: ctx.encryptionKey,
        resendApiKey: ctx.resendApiKey,
      });
      const now = new Date();

      const [createdMessage] = await ctx.db
        .insert(message)
        .values({
          id: crypto.randomUUID(),
          conversationId: existingConversation.id,
          senderType: "agent",
          senderId: membership.id,
          content: input.content,
          contentType: "text",
          direction: "outbound",
          metadata: providerMessageId ? { providerMessageId } : {},
          createdAt: now,
        })
        .returning();

      await ctx.db
        .update(conversation)
        .set({ lastMessageAt: now, updatedAt: now })
        .where(eq(conversation.id, existingConversation.id));

      return { message: createdMessage };
    }),
} satisfies TRPCRouterRecord;

async function sendProviderMessage({
  content,
  conversation: existingConversation,
  encryptionKey,
  resendApiKey,
}: {
  content: string;
  conversation: ConversationWithCustomer;
  encryptionKey?: string;
  resendApiKey?: string;
}) {
  if (!existingConversation.channelId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Conversation is missing a support channel",
    });
  }

  if (existingConversation.channel === "whatsapp") {
    const to = existingConversation.customer?.phone;
    if (!to) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Customer phone number is required for WhatsApp replies",
      });
    }

    if (!encryptionKey) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Channel encryption is not configured",
      });
    }

    const channel = await db.query.whatsappChannel.findFirst({
      where: and(
        eq(whatsappChannel.id, existingConversation.channelId),
        eq(whatsappChannel.organizationId, existingConversation.organizationId),
        eq(whatsappChannel.isActive, true),
      ),
    });

    if (!channel) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "WhatsApp channel is not active",
      });
    }

    const response = await sendWhatsAppText({
      accessToken: decryptChannelSecret(
        encryptionKey,
        channel.accessTokenEncrypted,
      ),
      content,
      phoneNumberId: channel.phoneNumberId,
      to,
    });

    return response.messages?.[0]?.id;
  }

  const to = existingConversation.customer?.email;
  if (!to) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Customer email is required for email replies",
    });
  }

  if (!resendApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Email provider is not configured",
    });
  }

  const channel = await db.query.emailChannel.findFirst({
    where: and(
      eq(emailChannel.id, existingConversation.channelId),
      eq(emailChannel.organizationId, existingConversation.organizationId),
      eq(emailChannel.isActive, true),
    ),
  });

  if (!channel) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Email channel is not active",
    });
  }

  const response = await sendEmailReply({
    apiKey: resendApiKey,
    content,
    from: `${channel.fromName} <${channel.emailAddress}>`,
    subject: `Re: ${existingConversation.subject ?? "Support request"}`,
    to,
  });

  return response.id;
}

async function sendWhatsAppText({
  accessToken,
  content,
  phoneNumberId,
  to,
}: {
  accessToken: string;
  content: string;
  phoneNumberId: string;
  to: string;
}) {
  const response = await fetch(
    `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: content },
      }),
    },
  );

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Failed to send WhatsApp message: ${await response.text()}`,
    });
  }

  return (await response.json()) as { messages?: { id?: string }[] };
}

async function sendEmailReply({
  apiKey,
  content,
  from,
  subject,
  to,
}: {
  apiKey: string;
  content: string;
  from: string;
  subject: string;
  to: string;
}) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      html: `<p>${escapeHtml(content).replaceAll("\n", "<br />")}</p>`,
      subject,
      text: content,
      to,
    }),
  });

  if (!response.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Failed to send email: ${await response.text()}`,
    });
  }

  return (await response.json()) as { id?: string };
}

function decryptChannelSecret(encryptionKey: string, encrypted: string) {
  const buffer = Buffer.from(encrypted, "base64");
  const iv = buffer.subarray(0, 16);
  const data = buffer.subarray(16);
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(encryptionKey, "hex"),
    iv,
  );
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);

  return decrypted.toString("utf8");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
