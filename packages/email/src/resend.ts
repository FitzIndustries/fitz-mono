import { render } from "@react-email/render";
import { Resend } from "resend";

import { TeamInviteEmail } from "./templates/team-invite";

export async function sendTeamInviteEmail({
  apiKey,
  from,
  inviteLink,
  organizationName,
  to,
}: {
  apiKey: string;
  from: string;
  inviteLink: string;
  organizationName: string;
  to: string;
}) {
  const resend = new Resend(apiKey);
  const html = await render(TeamInviteEmail({ inviteLink, organizationName }));
  const result = await resend.emails.send({
    from,
    to,
    subject: `You're invited to ${organizationName}`,
    html,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
