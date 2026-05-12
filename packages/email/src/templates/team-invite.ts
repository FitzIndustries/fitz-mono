import { createElement } from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

export function TeamInviteEmail({
  inviteLink,
  organizationName,
}: {
  inviteLink: string;
  organizationName: string;
}) {
  return createElement(
    Html,
    null,
    createElement(Head),
    createElement(Preview, null, "You're invited to ", organizationName),
    createElement(
      Body,
      { style: body },
      createElement(
        Container,
        { style: container },
        createElement(Text, { style: eyebrow }, "Fitz Industries"),
        createElement(
          Heading,
          { style: heading },
          "You're invited to ",
          organizationName,
        ),
        createElement(
          Text,
          { style: text },
          "Accept this invite to join the support workspace.",
        ),
        createElement(
          Section,
          { style: buttonSection },
          createElement(
            Button,
            { href: inviteLink, style: button },
            "Accept invite",
          ),
        ),
        createElement(
          Text,
          { style: smallText },
          "If the button does not work, copy and paste this link into your browser:",
        ),
        createElement(Text, { style: linkText }, inviteLink),
      ),
    ),
  );
}

const body = {
  backgroundColor: "#f8fafc",
  color: "#0f172a",
  fontFamily: "Arial, sans-serif",
  margin: "0",
};

const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  margin: "40px auto",
  maxWidth: "560px",
  padding: "40px",
};

const eyebrow = {
  color: "#64748b",
  fontSize: "12px",
  fontWeight: "700",
  letterSpacing: "0.22em",
  margin: "0 0 18px",
  textTransform: "uppercase" as const,
};

const heading = {
  color: "#020617",
  fontSize: "28px",
  lineHeight: "1.2",
  margin: "0 0 16px",
};

const text = {
  color: "#475569",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 24px",
};

const buttonSection = {
  margin: "28px 0",
};

const button = {
  backgroundColor: "#020617",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "700",
  padding: "14px 20px",
  textDecoration: "none",
};

const smallText = {
  color: "#64748b",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "24px 0 8px",
};

const linkText = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0",
  wordBreak: "break-all" as const,
};
