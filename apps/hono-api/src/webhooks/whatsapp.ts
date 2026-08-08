import { createDecipheriv } from "node:crypto";
import type { Context } from "hono";

import { and, eq } from "@fitzindustries/db";
import { db } from "@fitzindustries/db/client";
import {
  conversation,
  customer,
  message,
  ticket,
  whatsappChannel,
} from "@fitzindustries/db/schema";

interface WhatsAppWebhookBody {
  object: string;
  entry?: {
    id: string;
    changes?: {
      value?: {
        messaging_product: string;
        metadata?: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: {
          profile: { name: string };
          wa_id: string;
        }[];
        messages?: {
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
          image?: { id: string; mime_type: string; sha256: string };
        }[];
      };
    }[];
  }[];
}

export async function handleWhatsAppWebhook(c: Context) {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  if (c.req.method === "GET" && mode === "subscribe") {
    const validChannel = await db.query.whatsappChannel.findFirst({
      where: eq(whatsappChannel.webhookVerifyToken, token ?? ""),
    });

    if (validChannel) {
      return c.text(challenge ?? "");
    }

    return c.text("Forbidden", 403);
  }

  const body: WhatsAppWebhookBody = await c.req.json();

  if (body.object !== "whatsapp_business_account") {
    return c.json({ status: "ok" });
  }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value?.messages) continue;

      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;

      const channel = await db.query.whatsappChannel.findFirst({
        where: and(
          eq(whatsappChannel.phoneNumberId, phoneNumberId),
          eq(whatsappChannel.isActive, true),
        ),
      });

      if (!channel) {
        console.error(
          `No active WhatsApp channel found for phone number ID: ${phoneNumberId}`,
        );
        continue;
      }

      for (const msg of value.messages) {
        try {
          await processIncomingWhatsAppMessage(
            channel.id,
            channel.organizationId,
            msg,
            value.contacts?.[0],
          );
        } catch (error) {
          console.error("Error processing WhatsApp message:", error);
        }
      }
    }
  }

  return c.json({ status: "ok" });
}

interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppContact {
  profile?: { name?: string };
  wa_id?: string;
}

async function processIncomingWhatsAppMessage(
  channelId: string,
  organizationId: string,
  msg: WhatsAppMessage,
  contact?: WhatsAppContact,
) {
  const now = new Date();
  const phone = msg.from;
  const content = msg.text?.body ?? `[${msg.type} message]`;
  const customerName = contact?.profile?.name;

  const existingCustomer = await db.query.customer.findFirst({
    where: and(
      eq(customer.organizationId, organizationId),
      eq(customer.phone, phone),
    ),
  });

  let customerId: string;

  if (existingCustomer) {
    customerId = existingCustomer.id;
  } else {
    customerId = crypto.randomUUID();
    await db.insert(customer).values({
      id: customerId,
      organizationId,
      phone,
      name: customerName ?? null,
      metadata: {},
      tags: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  const existingConversation = await db.query.conversation.findFirst({
    where: and(
      eq(conversation.organizationId, organizationId),
      eq(conversation.customerId, customerId),
      eq(conversation.channel, "whatsapp"),
    ),
    orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
  });

  let conversationId: string;

  if (existingConversation?.status === "open") {
    conversationId = existingConversation.id;
  } else {
    conversationId = crypto.randomUUID();
    await db.insert(conversation).values({
      id: conversationId,
      organizationId,
      customerId,
      channel: "whatsapp",
      channelId,
      status: "open",
      subject: content.slice(0, 500),
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db.insert(message).values({
    id: crypto.randomUUID(),
    conversationId,
    senderType: "customer",
    senderId: customerId,
    content,
    contentType: "text",
    direction: "inbound",
    metadata: {
      whatsappMessageId: msg.id,
      whatsappTimestamp: msg.timestamp,
    },
    createdAt: now,
  });

  await db
    .update(conversation)
    .set({
      lastMessageAt: now,
      updatedAt: now,
    })
    .where(eq(conversation.id, conversationId));

  await ensureOpenTicket({ conversationId, organizationId, now });
}

async function ensureOpenTicket({
  conversationId,
  now,
  organizationId,
}: {
  conversationId: string;
  now: Date;
  organizationId: string;
}) {
  const existingTicket = await db.query.ticket.findFirst({
    where: and(
      eq(ticket.organizationId, organizationId),
      eq(ticket.conversationId, conversationId),
    ),
    orderBy: (tickets, { desc }) => [desc(tickets.createdAt)],
  });

  if (
    existingTicket?.status === "open" ||
    existingTicket?.status === "in_progress"
  ) {
    return;
  }

  await db.insert(ticket).values({
    id: crypto.randomUUID(),
    organizationId,
    conversationId,
    ticketType: "other",
    priority: "medium",
    status: "open",
    createdAt: now,
    updatedAt: now,
  });
}

export async function sendWhatsAppMessage(
  channelId: string,
  to: string,
  content: string,
) {
  const channel = await db.query.whatsappChannel.findFirst({
    where: eq(whatsappChannel.id, channelId),
  });

  if (!channel?.isActive) {
    throw new Error("WhatsApp channel not found or inactive");
  }

  const accessToken = decryptToken(channel.accessTokenEncrypted);

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${channel.phoneNumberId}/messages`,
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
    const error = await response.text();
    throw new Error(`Failed to send WhatsApp message: ${error}`);
  }

  return response.json();
}

function decryptToken(encrypted: string): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY not set");
  }
  const buffer = Buffer.from(encrypted, "base64");
  const iv = buffer.subarray(0, 16);
  const data = buffer.subarray(16);
  const decipher = createDecipheriv(
    "aes-256-cbc",
    Buffer.from(secret, "hex"),
    iv,
  );
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}
