import { createHmac } from "node:crypto";
import type { Context } from "hono";

import { and, eq } from "@fitzindustries/db";
import { db } from "@fitzindustries/db/client";
import {
  conversation,
  customer,
  emailChannel,
  message,
} from "@fitzindustries/db/schema";

interface EmailWebhookBody {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  timestamp?: string;
}

export async function handleEmailWebhook(c: Context) {
  const body: EmailWebhookBody = await c.req.json();
  const signature = c.req.header("X-Resend-Webhook-Signature");

  if (!body.from || !body.to) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const channel = await db.query.emailChannel.findFirst({
    where: and(
      eq(emailChannel.emailAddress, body.to),
      eq(emailChannel.isActive, true),
    ),
  });

  if (!channel) {
    console.error(`No active email channel found for: ${body.to}`);
    return c.json({ error: "Unknown email address" }, 404);
  }

  if (signature) {
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret) {
      const isValid = verifyResendSignature(signature, body, webhookSecret);
      if (!isValid) {
        return c.json({ error: "Invalid signature" }, 403);
      }
    }
  }

  try {
    await processIncomingEmail(channel.id, channel.organizationId, body);
    return c.json({ status: "ok" });
  } catch (error) {
    console.error("Error processing email:", error);
    return c.json({ error: "Processing failed" }, 500);
  }
}

async function processIncomingEmail(
  channelId: string,
  organizationId: string,
  body: EmailWebhookBody,
) {
  const now = new Date();

  const emailRegex = /<(.+?)>/;
  const emailMatch = emailRegex.exec(body.from);
  const customerEmail = emailMatch?.[1] ?? body.from;
  const customerName = emailMatch
    ? body.from.replace(emailRegex, "").trim()
    : null;

  const existingCustomer = await db.query.customer.findFirst({
    where: and(
      eq(customer.organizationId, organizationId),
      eq(customer.email, customerEmail),
    ),
  });

  let customerId: string;

  if (existingCustomer) {
    customerId = existingCustomer.id;

    if (!existingCustomer.name && customerName) {
      await db
        .update(customer)
        .set({ name: customerName, updatedAt: now })
        .where(eq(customer.id, customerId));
    }
  } else {
    customerId = crypto.randomUUID();
    await db.insert(customer).values({
      id: customerId,
      organizationId,
      email: customerEmail,
      name: customerName,
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
      eq(conversation.channel, "email"),
    ),
  });

  let conversationId: string;

  if (existingConversation?.status === "open") {
    conversationId = existingConversation.id;

    await db
      .update(conversation)
      .set({ lastMessageAt: now, updatedAt: now })
      .where(eq(conversation.id, conversationId));
  } else {
    conversationId = crypto.randomUUID();
    await db.insert(conversation).values({
      id: conversationId,
      organizationId,
      customerId,
      channel: "email",
      channelId,
      status: "open",
      subject: body.subject,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  const content = body.text ?? body.html?.replace(/<[^>]*>/g, "") ?? "";

  await db.insert(message).values({
    id: crypto.randomUUID(),
    conversationId,
    senderType: "customer",
    senderId: customerId,
    content,
    contentType: "text",
    direction: "inbound",
    metadata: {
      subject: body.subject,
      timestamp: body.timestamp,
    },
    createdAt: now,
  });
}

function verifyResendSignature(
  signature: string,
  body: EmailWebhookBody,
  secret: string,
): boolean {
  const timestamp = Math.floor(Date.now() / 1000 / 60 / 10);
  const signedPayload = `${timestamp}.${JSON.stringify(body)}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return signature === expectedSignature;
}

export async function sendEmail(
  channelId: string,
  to: string,
  subject: string,
  html: string,
) {
  const channel = await db.query.emailChannel.findFirst({
    where: eq(emailChannel.id, channelId),
  });

  if (!channel?.isActive) {
    throw new Error("Email channel not found or inactive");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${channel.fromName} <${channel.emailAddress}>`,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
}
