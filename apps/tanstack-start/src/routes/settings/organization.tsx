import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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
      <PageShell
        title="Organization"
        description="Loading workspace settings..."
      />
    );
  }

  if (!org) {
    return (
      <PageShell title="Organization" description="Workspace not found." />
    );
  }

  const settings = org.settings ?? {};
  const selectedFeatures = Array.isArray(settings.eventFeatures)
    ? new Set(
        settings.eventFeatures.filter(
          (value): value is string => typeof value === "string",
        ),
      )
    : new Set<string>();

  return (
    <PageShell
      title="Organization Settings"
      description="Manage your workspace identity and support preferences."
    >
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const featureValues = eventFeatures.filter((feature) =>
            formData.getAll("eventFeatures").includes(feature),
          );

          void saveOrganization.mutate({
            name: getFormString(formData, "name"),
            slug: getFormString(formData, "slug"),
            logoUrl: normalizeOptionalString(formData.get("logoUrl")),
            settings: {
              eventType: getFormString(
                formData,
                "eventType",
                "music-festivals",
              ),
              timezone: getFormString(formData, "timezone", "Europe/London"),
              language: getFormString(formData, "language", "English"),
              support247: formData.get("support247") === "on",
              afterHoursMessage: getFormString(
                formData,
                "afterHoursMessage",
              ).trim(),
              eventFeatures: featureValues,
            },
          });
        }}
      >
        <Section title="Organization Details">
          <Field label="Organization Name">
            <input
              name="name"
              defaultValue={org.name}
              className={inputClassName}
            />
          </Field>
          <Field label="Subdomain">
            <div className="flex items-center rounded-md border">
              <span className="bg-muted text-muted-foreground px-3 text-sm">
                https://
              </span>
              <input
                name="slug"
                defaultValue={org.slug}
                className="h-10 flex-1 rounded-r-md bg-transparent px-3 text-sm outline-none"
              />
              <span className="text-muted-foreground pr-3 text-sm">
                .eventsupport.io
              </span>
            </div>
          </Field>
          <Field label="Logo URL">
            <input
              name="logoUrl"
              defaultValue={org.logoUrl ?? ""}
              placeholder="https://..."
              className={inputClassName}
            />
          </Field>
        </Section>

        <Section title="Industry Focus">
          <Field label="Primary Event Type">
            <select
              name="eventType"
              defaultValue={getSettingString(
                settings,
                "eventType",
                "music-festivals",
              )}
              className={inputClassName}
            >
              <option value="music-festivals">Music Festivals</option>
              <option value="sports">Sports Events</option>
              <option value="theater">Theater & Performing Arts</option>
              <option value="conferences">Conferences & Trade Shows</option>
              <option value="nightlife">Nightlife & Clubs</option>
            </select>
          </Field>
          <Field label="Event Features">
            <div className="grid grid-cols-2 gap-3">
              {eventFeatures.map((feature) => (
                <label
                  key={feature}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="eventFeatures"
                    value={feature}
                    defaultChecked={selectedFeatures.has(feature)}
                  />
                  {featureLabel(feature)}
                </label>
              ))}
            </div>
          </Field>
        </Section>

        <Section title="Support Preferences">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Timezone">
              <select
                name="timezone"
                defaultValue={getSettingString(
                  settings,
                  "timezone",
                  "Europe/London",
                )}
                className={inputClassName}
              >
                <option value="Europe/London">Europe/London</option>
                <option value="Europe/Paris">Europe/Paris</option>
                <option value="America/New_York">America/New_York</option>
                <option value="America/Los_Angeles">America/Los_Angeles</option>
              </select>
            </Field>
            <Field label="Language">
              <select
                name="language"
                defaultValue={getSettingString(settings, "language", "English")}
                className={inputClassName}
              >
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              name="support247"
              defaultChecked={Boolean(settings.support247 ?? true)}
            />
            24/7 Support
          </label>
          <Field label="Outside Support Hours Message">
            <textarea
              name="afterHoursMessage"
              defaultValue={getSettingString(settings, "afterHoursMessage")}
              className="border-input bg-background min-h-28 w-full rounded-md border px-3 py-2 text-sm"
            />
          </Field>
        </Section>

        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {saveOrganization.isSuccess ? "Organization settings saved." : ""}
          </p>
          <button
            type="submit"
            className="bg-primary text-primary-foreground rounded-md px-5 py-2 text-sm font-medium"
            disabled={saveOrganization.isPending}
          >
            {saveOrganization.isPending ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-white/40 p-5 dark:bg-transparent">
      <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
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

function normalizeOptionalString(value: FormDataEntryValue | null) {
  const nextValue = typeof value === "string" ? value.trim() : "";
  return nextValue.length ? nextValue : null;
}

function getFormString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

function getSettingString(
  settings: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = settings[key];
  return typeof value === "string" ? value : fallback;
}

const inputClassName =
  "border-input bg-background h-10 w-full rounded-md border px-3 text-sm";
