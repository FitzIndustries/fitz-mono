import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

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
  const zero = useZero();
  const [savingChannelId, setSavingChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading channels...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Support channels</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Channel configuration loaded through Zero. Status changes update the
          local database immediately and sync automatically.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChannelGroup
          title="WhatsApp"
          emptyMessage="No WhatsApp channel configured."
        >
          {organization.whatsappChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              disabled={savingChannelId === channel.id}
              title={channel.name}
              isActive={channel.isActive ?? false}
              details={[channel.phoneNumber, channel.phoneNumberId]}
              onToggle={(isActive) =>
                void updateWhatsappChannelStatus({
                  channelId: channel.id,
                  isActive,
                })
              }
            />
          ))}
        </ChannelGroup>

        <ChannelGroup title="Email" emptyMessage="No email channel configured.">
          {organization.emailChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              disabled={savingChannelId === channel.id}
              title={channel.name}
              isActive={channel.isActive ?? false}
              details={[channel.emailAddress, channel.fromName]}
              onToggle={(isActive) =>
                void updateEmailChannelStatus({
                  channelId: channel.id,
                  isActive,
                })
              }
            />
          ))}
        </ChannelGroup>
      </div>
    </div>
  );

  async function updateEmailChannelStatus({
    channelId,
    isActive,
  }: {
    channelId: string;
    isActive: boolean;
  }) {
    await updateChannelStatus({
      channelId,
      write: () =>
        zero.mutate(mutators.channels.setEmailActive({ channelId, isActive })),
    });
  }

  async function updateWhatsappChannelStatus({
    channelId,
    isActive,
  }: {
    channelId: string;
    isActive: boolean;
  }) {
    await updateChannelStatus({
      channelId,
      write: () =>
        zero.mutate(
          mutators.channels.setWhatsappActive({ channelId, isActive }),
        ),
    });
  }

  async function updateChannelStatus({
    channelId,
    write,
  }: {
    channelId: string;
    write: () => ReturnType<typeof zero.mutate>;
  }) {
    setError(null);
    setSavingChannelId(channelId);

    try {
      const result = await write().client;

      if (result.type === "error") {
        setError(result.error.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update channel",
      );
    } finally {
      setSavingChannelId(null);
    }
  }
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
  disabled,
  details,
  isActive,
  onToggle,
  title,
}: {
  disabled: boolean;
  details: string[];
  isActive: boolean;
  onToggle: (isActive: boolean) => void;
  title: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-slate-950">{title}</p>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-600">
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>
      <div className="mt-3 space-y-1 text-sm text-slate-600">
        {details.map((detail) => (
          <p key={detail}>{detail}</p>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onToggle(!isActive)}
        className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
      >
        {disabled ? "Saving..." : isActive ? "Deactivate" : "Activate"}
      </button>
    </div>
  );
}
