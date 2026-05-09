import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading integrations...</p>;
  }

  return <IntegrationSettings />;
}

function IntegrationSettings() {
  const [organization] = useZeroQuery(queries.support.channels());

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading integrations...</p>;
  }

  const whatsappBotpressCount = organization.whatsappChannels.filter(
    (channel) => channel.botpressBotId,
  ).length;
  const emailBotpressCount = organization.emailChannels.filter(
    (channel) => channel.botpressBotId,
  ).length;
  const verifiedSesCount = organization.emailChannels.filter(
    (channel) => channel.awsSesVerified,
  ).length;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Integrations</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Read-only integration status loaded through Zero. Connection flows
          will be restored after the read path is stable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <IntegrationCard
          title="Stripe"
          status={organization.stripeCustomerId ? "Connected" : "Not connected"}
          description={organization.stripeCustomerId ?? "No customer ID stored"}
        />
        <IntegrationCard
          title="WhatsApp Botpress"
          status={whatsappBotpressCount > 0 ? "Configured" : "Not configured"}
          description={`${String(whatsappBotpressCount)} WhatsApp channel${
            whatsappBotpressCount === 1 ? "" : "s"
          } with Botpress bot IDs`}
        />
        <IntegrationCard
          title="Email Botpress"
          status={emailBotpressCount > 0 ? "Configured" : "Not configured"}
          description={`${String(emailBotpressCount)} email channel${
            emailBotpressCount === 1 ? "" : "s"
          } with Botpress bot IDs`}
        />
        <IntegrationCard
          title="AWS SES"
          status={verifiedSesCount > 0 ? "Verified" : "Not verified"}
          description={`${String(verifiedSesCount)} verified email channel${
            verifiedSesCount === 1 ? "" : "s"
          }`}
        />
      </div>
    </div>
  );
}

function IntegrationCard({
  description,
  status,
  title,
}: {
  description: string;
  status: string;
  title: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 break-words text-slate-600">
        {description}
      </p>
    </div>
  );
}
