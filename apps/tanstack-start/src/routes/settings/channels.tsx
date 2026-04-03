import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
  Input,
} from "@fitzindustries/ui/components";

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
    mutationFn: (payload: {
      name: string;
      phoneNumber: string;
      phoneNumberId: string;
      webhookVerifyToken: string;
      accessToken: string;
      isActive: boolean;
    }) =>
      apiFetch<{ whatsapp: ChannelsResponse["whatsapp"] }>(
        "/api/channels/whatsapp",
        {
          method: "PUT",
          body: JSON.stringify({
            ...payload,
            accessToken: payload.accessToken || undefined,
          }),
        },
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
    },
  });

  const saveEmail = useMutation({
    mutationFn: (payload: {
      name: string;
      emailAddress: string;
      fromName: string;
      awsSesArn: string;
      isActive: boolean;
    }) =>
      apiFetch<{ email: ChannelsResponse["email"] }>("/api/channels/email", {
        method: "PUT",
        body: JSON.stringify({
          ...payload,
          awsSesArn: normalizeOptionalString(payload.awsSesArn),
        }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["channel-settings"] });
    },
  });

  if (channelsQuery.isPending) {
    return (
      <div className="mx-auto max-w-4xl p-8">Loading channel settings...</div>
    );
  }

  return (
    <ChannelsForm
      key={`${channelsQuery.data?.whatsapp?.id ?? "whatsapp"}:${channelsQuery.data?.email?.id ?? "email"}`}
      channels={channelsQuery.data}
      saveWhatsapp={saveWhatsapp}
      saveEmail={saveEmail}
    />
  );
}

function ChannelsForm({
  channels,
  saveWhatsapp,
  saveEmail,
}: {
  channels: ChannelsResponse | undefined;
  saveWhatsapp: {
    mutateAsync: (payload: {
      name: string;
      phoneNumber: string;
      phoneNumberId: string;
      webhookVerifyToken: string;
      accessToken: string;
      isActive: boolean;
    }) => Promise<unknown>;
    isPending: boolean;
  };
  saveEmail: {
    mutateAsync: (payload: {
      name: string;
      emailAddress: string;
      fromName: string;
      awsSesArn: string;
      isActive: boolean;
    }) => Promise<unknown>;
    isPending: boolean;
  };
}) {
  const [whatsAppForm, setWhatsAppForm] = useState({
    name: channels?.whatsapp?.name ?? "Festival WhatsApp",
    phoneNumber: channels?.whatsapp?.phoneNumber ?? "",
    phoneNumberId: channels?.whatsapp?.phoneNumberId ?? "",
    webhookVerifyToken: channels?.whatsapp?.webhookVerifyToken ?? "",
    accessToken: "",
    isActive: channels?.whatsapp?.isActive ?? true,
  });
  const [emailForm, setEmailForm] = useState({
    name: channels?.email?.name ?? "Primary Support",
    emailAddress: channels?.email?.emailAddress ?? "",
    fromName: channels?.email?.fromName ?? "Support Team",
    awsSesArn: channels?.email?.awsSesArn ?? "",
    isActive: channels?.email?.isActive ?? true,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">Channels</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect the numbers and inboxes customers use to reach your team.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp Business</CardTitle>
          <CardDescription>
            Messages route into the shared support inbox through the Meta API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Channel Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={whatsAppForm.name}
                    onChange={(event) =>
                      setWhatsAppForm({
                        ...whatsAppForm,
                        name: event.target.value,
                      })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <FieldContent>
                  <Input
                    value={whatsAppForm.phoneNumber}
                    onChange={(event) =>
                      setWhatsAppForm({
                        ...whatsAppForm,
                        phoneNumber: event.target.value,
                      })
                    }
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Phone Number ID</FieldLabel>
                <FieldContent>
                  <Input
                    value={whatsAppForm.phoneNumberId}
                    onChange={(event) =>
                      setWhatsAppForm({
                        ...whatsAppForm,
                        phoneNumberId: event.target.value,
                      })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Webhook Verify Token</FieldLabel>
                <FieldContent>
                  <Input
                    value={whatsAppForm.webhookVerifyToken}
                    onChange={(event) =>
                      setWhatsAppForm({
                        ...whatsAppForm,
                        webhookVerifyToken: event.target.value,
                      })
                    }
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel>Access Token</FieldLabel>
              <FieldContent>
                <Input
                  type="password"
                  value={whatsAppForm.accessToken}
                  onChange={(event) =>
                    setWhatsAppForm({
                      ...whatsAppForm,
                      accessToken: event.target.value,
                    })
                  }
                  placeholder={
                    channels?.whatsapp
                      ? "Leave blank to keep existing token"
                      : "Enter Meta access token"
                  }
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                checked={whatsAppForm.isActive}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setWhatsAppForm({
                    ...whatsAppForm,
                    isActive: checked === true,
                  })
                }
              />
              <FieldContent>
                <FieldLabel>Channel active</FieldLabel>
              </FieldContent>
            </Field>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  void saveWhatsapp.mutateAsync(whatsAppForm).then(() =>
                    setWhatsAppForm((current) => ({
                      ...current,
                      accessToken: "",
                    })),
                  );
                }}
                disabled={saveWhatsapp.isPending}
              >
                {saveWhatsapp.isPending ? "Saving..." : "Save WhatsApp"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email</CardTitle>
          <CardDescription>
            Inbound support email aliases flow into the same live queue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Channel Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={emailForm.name}
                    onChange={(event) =>
                      setEmailForm({ ...emailForm, name: event.target.value })
                    }
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>From Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={emailForm.fromName}
                    onChange={(event) =>
                      setEmailForm({
                        ...emailForm,
                        fromName: event.target.value,
                      })
                    }
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel>Email Address</FieldLabel>
              <FieldContent>
                <Input
                  value={emailForm.emailAddress}
                  onChange={(event) =>
                    setEmailForm({
                      ...emailForm,
                      emailAddress: event.target.value,
                    })
                  }
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>SES / Provider ARN</FieldLabel>
              <FieldContent>
                <Input
                  value={emailForm.awsSesArn}
                  onChange={(event) =>
                    setEmailForm({
                      ...emailForm,
                      awsSesArn: event.target.value,
                    })
                  }
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                checked={emailForm.isActive}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setEmailForm({ ...emailForm, isActive: checked === true })
                }
              />
              <FieldContent>
                <FieldLabel>Channel active</FieldLabel>
              </FieldContent>
            </Field>
            <div className="flex justify-end">
              <Button
                onClick={() => {
                  void saveEmail.mutateAsync(emailForm);
                }}
                disabled={saveEmail.isPending}
              >
                {saveEmail.isPending ? "Saving..." : "Save Email"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeOptionalString(value: string) {
  const nextValue = value.trim();
  return nextValue.length ? nextValue : null;
}
