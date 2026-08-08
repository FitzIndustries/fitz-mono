import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { env } from "~/env";
import { makeTRPCClient } from "~/lib/trpc";
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
  const [editingWhatsappChannelId, setEditingWhatsappChannelId] = useState<
    string | null
  >(null);
  const [savingChannelId, setSavingChannelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading channels...</p>;
  }

  const editingWhatsappChannel =
    organization.whatsappChannels.find(
      (channel) => channel.id === editingWhatsappChannelId,
    ) ?? undefined;

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
        {message ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <WhatsappChannelForm
          key={editingWhatsappChannel?.id ?? "new-whatsapp-channel"}
          channel={editingWhatsappChannel}
          organizationId={organization.id}
          onCancelEdit={() => setEditingWhatsappChannelId(null)}
          onError={setError}
          onSuccess={setMessage}
        />
        <EmailChannelForm
          channel={organization.emailChannels[0]}
          organizationId={organization.id}
          onError={setError}
          onSuccess={setMessage}
        />
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
              onEdit={() => setEditingWhatsappChannelId(channel.id)}
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

function WhatsappChannelForm({
  channel,
  onCancelEdit,
  onError,
  onSuccess,
  organizationId,
}: {
  channel:
    | {
        id: string;
        name: string;
        phoneNumber: string;
        phoneNumberId: string;
        webhookVerifyToken: string | null | undefined;
        isActive: boolean | null | undefined;
      }
    | undefined;
  onCancelEdit: () => void;
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
  organizationId: string;
}) {
  const [name, setName] = useState(channel?.name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(channel?.phoneNumber ?? "");
  const [phoneNumberId, setPhoneNumberId] = useState(
    channel?.phoneNumberId ?? "",
  );
  const [accessToken, setAccessToken] = useState("");
  const [webhookVerifyToken, setWebhookVerifyToken] = useState(
    channel?.webhookVerifyToken ?? "",
  );
  const [isActive, setIsActive] = useState(channel?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const webhookUrl = `${env.VITE_API_URL}/api/webhooks/whatsapp`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    onSuccess(null);
    setIsSaving(true);

    try {
      const trpc = makeTRPCClient();
      await trpc.channels.upsertWhatsapp.mutate({
        organizationId,
        channelId: channel?.id,
        name,
        phoneNumber,
        phoneNumberId,
        accessToken: accessToken.trim() || undefined,
        webhookVerifyToken,
        isActive,
      });
      setAccessToken("");
      if (!channel) {
        setName("");
        setPhoneNumber("");
        setPhoneNumberId("");
        setWebhookVerifyToken("");
        setIsActive(true);
      }
      onSuccess(
        "WhatsApp channel saved. Zero will sync the channel list shortly.",
      );
    } catch (caughtError) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save WhatsApp channel",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">WhatsApp setup</h3>
          <p className="mt-1 text-sm text-slate-600">
            {channel
              ? `Editing ${channel.name}`
              : "Add a WhatsApp Business number for this organization."}
          </p>
        </div>
        {channel ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            New number
          </button>
        ) : null}
      </div>
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">
          Meta webhook callback URL
        </p>
        <p className="mt-2 font-mono text-xs break-all text-slate-700">
          {webhookUrl}
        </p>
        <p className="mt-2">
          In Meta, subscribe this callback to WhatsApp messages and use the same
          verify token you enter below.
        </p>
      </div>
      <div className="mt-4 grid gap-3">
        <TextInput label="Name" value={name} onChange={setName} />
        <TextInput
          label="Phone number"
          value={phoneNumber}
          onChange={setPhoneNumber}
        />
        <TextInput
          label="Phone number ID"
          value={phoneNumberId}
          onChange={setPhoneNumberId}
        />
        <TextInput
          label="Access token"
          value={accessToken}
          onChange={setAccessToken}
          placeholder={
            channel ? "Leave blank to keep existing token" : undefined
          }
        />
        <TextInput
          label="Webhook verify token"
          value={webhookVerifyToken}
          onChange={setWebhookVerifyToken}
        />
        <ToggleInput checked={isActive} label="Active" onChange={setIsActive} />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSaving ? "Saving..." : "Save WhatsApp"}
      </button>
    </form>
  );
}

function EmailChannelForm({
  channel,
  onError,
  onSuccess,
  organizationId,
}: {
  channel:
    | {
        name: string;
        emailAddress: string;
        fromName: string;
        awsSesArn: string | null | undefined;
        isActive: boolean | null | undefined;
      }
    | undefined;
  onError: (message: string | null) => void;
  onSuccess: (message: string | null) => void;
  organizationId: string;
}) {
  const [name, setName] = useState(channel?.name ?? "");
  const [emailAddress, setEmailAddress] = useState(channel?.emailAddress ?? "");
  const [fromName, setFromName] = useState(channel?.fromName ?? "");
  const [awsSesArn, setAwsSesArn] = useState(channel?.awsSesArn ?? "");
  const [isActive, setIsActive] = useState(channel?.isActive ?? true);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    onSuccess(null);
    setIsSaving(true);

    try {
      const trpc = makeTRPCClient();
      await trpc.channels.upsertEmail.mutate({
        organizationId,
        name,
        emailAddress,
        fromName,
        awsSesArn: awsSesArn.trim() || null,
        isActive,
      });
      onSuccess(
        "Email channel saved. Zero will sync the channel list shortly.",
      );
    } catch (caughtError) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save email channel",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 className="text-lg font-semibold">Email setup</h3>
      <div className="mt-4 grid gap-3">
        <TextInput label="Name" value={name} onChange={setName} />
        <TextInput
          label="Email address"
          type="email"
          value={emailAddress}
          onChange={setEmailAddress}
        />
        <TextInput label="From name" value={fromName} onChange={setFromName} />
        <TextInput
          label="AWS SES ARN"
          value={awsSesArn}
          onChange={setAwsSesArn}
        />
        <ToggleInput checked={isActive} label="Active" onChange={setIsActive} />
      </div>
      <button
        type="submit"
        disabled={isSaving}
        className="mt-4 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSaving ? "Saving..." : "Save email"}
      </button>
    </form>
  );
}

function TextInput({
  label,
  onChange,
  placeholder,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "email" | "text";
  value: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
      />
    </label>
  );
}

function ToggleInput({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
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
  disabled,
  details,
  isActive,
  onEdit,
  onToggle,
  title,
}: {
  disabled: boolean;
  details: string[];
  isActive: boolean;
  onEdit?: () => void;
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
      <div className="mt-4 flex flex-wrap gap-2">
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Edit
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onToggle(!isActive)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          {disabled ? "Saving..." : isActive ? "Deactivate" : "Activate"}
        </button>
      </div>
    </div>
  );
}
