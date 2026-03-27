import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { apiFetch } from "~/lib/api";

export const Route = createFileRoute("/settings/channels")({
  component: ChannelsSettings,
});

interface ChannelsResponse {
  whatsapp: {
    id: string;
    name: string;
    phoneNumber: string;
    phoneNumberId: string;
    webhookVerifyToken: string | null;
    isActive: boolean;
  } | null;
  email: {
    id: string;
    name: string;
    emailAddress: string;
    fromName: string;
    awsSesArn: string | null;
    awsSesVerified: boolean | null;
    isActive: boolean;
  } | null;
}

function ChannelsSettings() {
  const queryClient = useQueryClient();
  const channelsQuery = useQuery({
    queryKey: ["channel-settings"],
    queryFn: () => apiFetch<ChannelsResponse>("/api/channels"),
  });

  const saveWhatsapp = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<{ whatsapp: ChannelsResponse["whatsapp"] }>(
        "/api/channels/whatsapp",
        {
          method: "PUT",
          body: JSON.stringify(payload),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
    },
  });

  const saveEmail = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<{ email: ChannelsResponse["email"] }>("/api/channels/email", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
    },
  });

  const channels = channelsQuery.data;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Channels</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect the numbers and inboxes customers use to reach your team.
        </p>
      </div>

      <div className="space-y-8">
        <ChannelCard
          title="WhatsApp Business"
          description="Messages route into the shared support inbox through the Meta API."
          status={channels?.whatsapp?.isActive ? "Connected" : "Not connected"}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              const accessToken = getFormString(formData, "accessToken").trim();

              void saveWhatsapp.mutate({
                name: getFormString(formData, "name", "WhatsApp Inbox"),
                phoneNumber: getFormString(formData, "phoneNumber"),
                phoneNumberId: getFormString(formData, "phoneNumberId"),
                accessToken: accessToken.length ? accessToken : undefined,
                webhookVerifyToken: getFormString(
                  formData,
                  "webhookVerifyToken",
                ),
                isActive: formData.get("isActive") === "on",
              });
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Channel Name">
                <input
                  name="name"
                  defaultValue={channels?.whatsapp?.name ?? "Festival WhatsApp"}
                  className={inputClassName}
                />
              </Field>
              <Field label="Phone Number">
                <input
                  name="phoneNumber"
                  defaultValue={channels?.whatsapp?.phoneNumber ?? ""}
                  className={inputClassName}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Phone Number ID">
                <input
                  name="phoneNumberId"
                  defaultValue={channels?.whatsapp?.phoneNumberId ?? ""}
                  className={inputClassName}
                />
              </Field>
              <Field label="Webhook Verify Token">
                <input
                  name="webhookVerifyToken"
                  defaultValue={channels?.whatsapp?.webhookVerifyToken ?? ""}
                  className={inputClassName}
                />
              </Field>
            </div>
            <Field label="Access Token">
              <input
                name="accessToken"
                type="password"
                placeholder={
                  channels?.whatsapp
                    ? "Leave blank to keep existing token"
                    : "Enter Meta access token"
                }
                className={inputClassName}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={channels?.whatsapp?.isActive ?? true}
              />
              Channel active
            </label>
            <SaveButton
              isPending={saveWhatsapp.isPending}
              label="Save WhatsApp"
            />
          </form>
        </ChannelCard>

        <ChannelCard
          title="Email"
          description="Inbound support email aliases flow into the same live queue."
          status={channels?.email?.isActive ? "Connected" : "Not connected"}
        >
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              void saveEmail.mutate({
                name: getFormString(formData, "name", "Email Inbox"),
                emailAddress: getFormString(formData, "emailAddress"),
                fromName: getFormString(formData, "fromName"),
                awsSesArn: normalizeOptionalString(formData.get("awsSesArn")),
                isActive: formData.get("isActive") === "on",
              });
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <Field label="Channel Name">
                <input
                  name="name"
                  defaultValue={channels?.email?.name ?? "Primary Support"}
                  className={inputClassName}
                />
              </Field>
              <Field label="From Name">
                <input
                  name="fromName"
                  defaultValue={channels?.email?.fromName ?? "Support Team"}
                  className={inputClassName}
                />
              </Field>
            </div>
            <Field label="Email Address">
              <input
                name="emailAddress"
                defaultValue={channels?.email?.emailAddress ?? ""}
                className={inputClassName}
              />
            </Field>
            <Field label="SES / Provider ARN">
              <input
                name="awsSesArn"
                defaultValue={channels?.email?.awsSesArn ?? ""}
                className={inputClassName}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={channels?.email?.isActive ?? true}
              />
              Channel active
            </label>
            <SaveButton isPending={saveEmail.isPending} label="Save Email" />
          </form>
        </ChannelCard>
      </div>
    </div>
  );
}

function ChannelCard({
  title,
  description,
  status,
  children,
}: {
  title: string;
  description: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {status}
        </span>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function SaveButton({
  isPending,
  label,
}: {
  isPending: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
      disabled={isPending}
    >
      {isPending ? "Saving..." : label}
    </button>
  );
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue.length ? nextValue : null;
}

function getFormString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

const inputClassName =
  "border-input bg-background h-10 w-full rounded-md border px-3 text-sm";
