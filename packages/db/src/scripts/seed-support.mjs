import pg from "pg";

const demoCustomerEmail = "demo.customer@example.com";
const connectionString = process.env.POSTGRES_URL;

if (typeof connectionString !== "string" || connectionString === "") {
  throw new Error("POSTGRES_URL environment variable is required");
}

const pool = new pg.Pool({ connectionString });

async function seedSupportData() {
  const { rows: organizations } = await pool.query(
    `select id, name from organization where is_active = true`,
  );

  if (organizations.length === 0) {
    console.log("No active organizations found. Log in once to create one.");
    return;
  }

  for (const org of organizations) {
    const { rows: existingCustomers } = await pool.query(
      `select 1 from customer where organization_id = $1 and email = $2 limit 1`,
      [org.id, demoCustomerEmail],
    );

    if (existingCustomers.length > 0) {
      console.log(`Demo support data already exists for ${org.name}.`);
      continue;
    }

    const now = new Date();
    const customerId = crypto.randomUUID();
    const conversationId = crypto.randomUUID();
    const ticketId = crypto.randomUUID();

    await pool.query("begin");

    try {
      await pool.query(
        `insert into email_channel (id, organization_id, name, email_address, from_name, aws_ses_verified, is_active)
         values ($1, $2, $3, $4, $5, true, true)`,
        [
          crypto.randomUUID(),
          org.id,
          "Demo Support Email",
          "support@example.com",
          org.name,
        ],
      );

      await pool.query(
        `insert into whatsapp_channel (id, organization_id, name, phone_number, phone_number_id, access_token_encrypted, webhook_verify_token, is_active)
         values ($1, $2, $3, $4, $5, $6, $7, false)`,
        [
          crypto.randomUUID(),
          org.id,
          "Demo WhatsApp",
          "+15550101010",
          "demo-phone-number-id",
          "demo-token",
          "demo-verify-token",
        ],
      );

      await pool.query(
        `insert into customer (id, organization_id, email, phone, name, metadata, tags)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [
          customerId,
          org.id,
          demoCustomerEmail,
          "+15551234567",
          "Demo Customer",
          JSON.stringify({ source: "seed" }),
          ["demo", "support"],
        ],
      );

      await pool.query(
        `insert into conversation (id, organization_id, customer_id, channel, status, subject, last_message_at)
         values ($1, $2, $3, 'email', 'open', $4, $5)`,
        [
          conversationId,
          org.id,
          customerId,
          "Demo booking refund question",
          now,
        ],
      );

      await pool.query(
        `insert into message (id, conversation_id, sender_type, sender_id, content, content_type, direction, metadata, created_at)
         values
          ($1, $2, 'customer', $3, $4, 'text', 'inbound', $5, $6),
          ($7, $2, 'system', null, $8, 'text', 'inbound', $5, $9)`,
        [
          crypto.randomUUID(),
          conversationId,
          customerId,
          "Hi, I need help changing my booking and understanding the refund policy.",
          JSON.stringify({ source: "seed" }),
          new Date(now.getTime() - 5 * 60 * 1000),
          crypto.randomUUID(),
          "Demo conversation created for local testing.",
          now,
        ],
      );

      await pool.query(
        `insert into ticket (id, organization_id, conversation_id, ticket_type, priority, status)
         values ($1, $2, $3, 'refund', 'high', 'open')`,
        [ticketId, org.id, conversationId],
      );

      await pool.query("commit");
      console.log(`Created demo support data for ${org.name}.`);
    } catch (error) {
      await pool.query("rollback");
      throw error;
    }
  }
}

try {
  await seedSupportData();
} finally {
  await pool.end();
}
