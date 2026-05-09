import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading channels...</p>;
  }

  return <ChannelSettings />;
}

function ChannelSettings() {
  const [organization] = useZeroQuery(queries.support.channels());

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading channels...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Support channels</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Read-only channel configuration loaded through Zero. Channel editing
          will be restored after the read path is stable.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelGroup
          title="WhatsApp"
          emptyMessage="No WhatsApp channel configured."
        >
          {organization.whatsappChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              title={channel.name}
              status={channel.isActive ? "Active" : "Inactive"}
              details={[channel.phoneNumber, channel.phoneNumberId]}
            />
          ))}
        </ChannelGroup>

        <ChannelGroup title="Email" emptyMessage="No email channel configured.">
          {organization.emailChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              title={channel.name}
              status={channel.isActive ? "Active" : "Inactive"}
              details={[channel.emailAddress, channel.fromName]}
            />
          ))}
        </ChannelGroup>
      </div>
    </div>
  );
}

function ChannelGroup({
  children,
  emptyMessage,
  title,
}: {
  children: React.ReactNode;
  emptyMessage: string;
  title: string;
}) {
  const childCount = Array.isArray(children)
    ? children.length
    : children
      ? 1
      : 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-4 space-y-3">
        {childCount > 0 ? (
          children
        ) : (
          <p className="text-sm text-slate-500">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

function ChannelCard({
  details,
  status,
  title,
}: {
  details: string[];
  status: string;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-950">{title}</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
          {status}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-600">
        {details.map((detail) => (
          <p key={detail}>{detail}</p>
        ))}
      </div>
    </div>
  );
}
