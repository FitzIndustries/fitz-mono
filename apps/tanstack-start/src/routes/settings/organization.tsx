import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@fitzindustries/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@fitzindustries/ui/components/card";
import { Checkbox } from "@fitzindustries/ui/components/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@fitzindustries/ui/components/field";
import { Input } from "@fitzindustries/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fitzindustries/ui/components/select";
import { Textarea } from "@fitzindustries/ui/components/textarea";

import { apiFetch } from "~/lib/api";

export const Route = createFileRoute("/settings/organization")({
  component: OrganizationSettings,
});

const eventFeatures = [
  "ticket-sales",
  "season-passes",
  "vip-packages",
  "camping",
  "parking",
  "refunds",
] as const;

interface OrganizationResponse {
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    settings: Record<string, unknown> | null;
  } | null;
}

function OrganizationSettings() {
  const queryClient = useQueryClient();
  const organizationQuery = useQuery({
    queryKey: ["organization-settings"],
    queryFn: () => apiFetch<OrganizationResponse>("/api/organization"),
  });

  const saveOrganization = useMutation({
    mutationFn: (payload: {
      name: string;
      slug: string;
      logoUrl: string | null;
      settings: Record<string, unknown>;
    }) =>
      apiFetch<OrganizationResponse>("/api/organization", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["organization-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["viewer-organization"] }),
      ]);
    },
  });

  const org = organizationQuery.data?.organization;

  if (organizationQuery.isPending) {
    return (
      <div className="mx-auto max-w-4xl p-8">Loading workspace settings...</div>
    );
  }

  if (!org) {
    return <div className="mx-auto max-w-4xl p-8">Workspace not found.</div>;
  }

  return (
    <OrganizationForm
      key={org.id}
      org={org}
      saveOrganization={saveOrganization}
    />
  );
}

function OrganizationForm({
  org,
  saveOrganization,
}: {
  org: NonNullable<OrganizationResponse["organization"]>;
  saveOrganization: ReturnType<
    typeof useMutation<
      OrganizationResponse,
      Error,
      {
        name: string;
        slug: string;
        logoUrl: string | null;
        settings: Record<string, unknown>;
      }
    >
  >;
}) {
  const settings = org.settings ?? {};
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [logoUrl, setLogoUrl] = useState(org.logoUrl ?? "");
  const [eventType, setEventType] = useState(
    getSettingString(settings, "eventType", "music-festivals"),
  );
  const [timezone, setTimezone] = useState(
    getSettingString(settings, "timezone", "Europe/London"),
  );
  const [language, setLanguage] = useState(
    getSettingString(settings, "language", "English"),
  );
  const [support247, setSupport247] = useState(
    getSettingBoolean(settings, "support247", true),
  );
  const [afterHoursMessage, setAfterHoursMessage] = useState(
    getSettingString(settings, "afterHoursMessage"),
  );
  const [selectedFeatures, setSelectedFeatures] = useState(
    getSettingStringArray(settings, "eventFeatures"),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">Organization Settings</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your workspace identity and support defaults.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Branding and workspace URL used across the support app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Organization Name</FieldLabel>
              <FieldContent>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Subdomain</FieldLabel>
              <FieldContent>
                <div className="flex items-center rounded-md border">
                  <span className="bg-muted text-muted-foreground px-3 text-sm">
                    https://
                  </span>
                  <Input
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                    className="border-0 shadow-none focus-visible:ring-0"
                  />
                  <span className="text-muted-foreground px-3 text-sm">
                    .eventsupport.io
                  </span>
                </div>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Logo URL</FieldLabel>
              <FieldContent>
                <Input
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://..."
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry Focus</CardTitle>
          <CardDescription>
            Tailor the workspace for the event types you support most.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Primary Event Type</FieldLabel>
              <FieldContent>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="music-festivals">
                      Music Festivals
                    </SelectItem>
                    <SelectItem value="sports">Sports Events</SelectItem>
                    <SelectItem value="theater">
                      Theater & Performing Arts
                    </SelectItem>
                    <SelectItem value="conferences">
                      Conferences & Trade Shows
                    </SelectItem>
                    <SelectItem value="nightlife">Nightlife & Clubs</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Event Features</FieldLabel>
              <FieldContent>
                <div className="grid grid-cols-2 gap-3">
                  {eventFeatures.map((feature) => (
                    <Field
                      key={feature}
                      orientation="horizontal"
                      className="items-center rounded-md border p-3"
                    >
                      <Checkbox
                        checked={selectedFeatures.includes(feature)}
                        onCheckedChange={(
                          checked: boolean | "indeterminate",
                        ) => {
                          setSelectedFeatures((current) =>
                            checked === true
                              ? [...new Set([...current, feature])]
                              : current.filter((value) => value !== feature),
                          );
                        }}
                      />
                      <FieldContent>
                        <FieldLabel>{featureLabel(feature)}</FieldLabel>
                      </FieldContent>
                    </Field>
                  ))}
                </div>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Support Preferences</CardTitle>
          <CardDescription>
            Defaults used by agents and automations across the workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>Timezone</FieldLabel>
                <FieldContent>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/London">
                        Europe/London
                      </SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                      <SelectItem value="America/New_York">
                        America/New_York
                      </SelectItem>
                      <SelectItem value="America/Los_Angeles">
                        America/Los_Angeles
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Language</FieldLabel>
                <FieldContent>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldContent>
              </Field>
            </div>
            <Field orientation="horizontal">
              <Checkbox
                checked={support247}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setSupport247(checked === true)
                }
              />
              <FieldContent>
                <FieldLabel>24/7 Support</FieldLabel>
                <FieldDescription>
                  Keep agents and messaging active around the clock.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Outside Support Hours Message</FieldLabel>
              <FieldContent>
                <Textarea
                  value={afterHoursMessage}
                  onChange={(event) => setAfterHoursMessage(event.target.value)}
                  className="min-h-28"
                />
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {saveOrganization.isSuccess ? "Organization settings saved." : ""}
        </p>
        <Button
          onClick={() => {
            void saveOrganization.mutate({
              name,
              slug,
              logoUrl: normalizeOptionalString(logoUrl),
              settings: {
                eventType,
                timezone,
                language,
                support247,
                afterHoursMessage: afterHoursMessage.trim(),
                eventFeatures: selectedFeatures,
              },
            });
          }}
          disabled={saveOrganization.isPending}
        >
          {saveOrganization.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function featureLabel(value: (typeof eventFeatures)[number]) {
  switch (value) {
    case "ticket-sales":
      return "Ticket Sales";
    case "season-passes":
      return "Season Passes";
    case "vip-packages":
      return "VIP Packages";
    case "camping":
      return "Camping / Accommodation";
    case "parking":
      return "Parking Passes";
    case "refunds":
      return "Refunds & Transfers";
  }
}

function normalizeOptionalString(value: string) {
  const nextValue = value.trim();
  return nextValue.length ? nextValue : null;
}

function getSettingString(
  settings: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

function getSettingBoolean(
  settings: Record<string, unknown>,
  key: string,
  fallback: boolean,
) {
  const value = settings[key];
  return typeof value === "boolean" ? value : fallback;
}

function getSettingStringArray(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
