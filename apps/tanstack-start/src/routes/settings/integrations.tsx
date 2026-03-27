import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { cn } from "@fitzindustries/ui";

export const Route = createFileRoute("/settings/integrations")({
  component: IntegrationsSettings,
});

type Category = "all" | "tickets" | "crm" | "analytics";

function IntegrationsSettings() {
  const [activeTab, setActiveTab] = useState<Category>("all");

  const integrations = [
    {
      name: "Stripe",
      description: "Process refunds and manage ticket payments",
      category: "tickets" as Category,
      logo: "💳",
      connected: true,
    },
    {
      name: "Salesforce",
      description: "Sync customer data with your CRM",
      category: "crm" as Category,
      logo: "☁️",
      connected: false,
    },
    {
      name: "HubSpot",
      description: "Sync contacts and track customer journeys",
      category: "crm" as Category,
      logo: "🔶",
      connected: false,
    },
    {
      name: "Slack",
      description: "Get real-time notifications in Slack",
      category: "tickets" as Category,
      logo: "💬",
      connected: true,
    },
    {
      name: "Segment",
      description: "Track customer events and behavior",
      category: "analytics" as Category,
      logo: "🔮",
      connected: false,
    },
    {
      name: "Intercom",
      description: "Unified customer messaging platform",
      category: "crm" as Category,
      logo: "💙",
      connected: false,
    },
    {
      name: "Google Analytics",
      description: "Track support metrics and conversions",
      category: "analytics" as Category,
      logo: "📊",
      connected: false,
    },
    {
      name: "Zendesk",
      description: "Import tickets from Zendesk",
      category: "tickets" as Category,
      logo: "🎯",
      connected: false,
    },
  ];

  const categories: { id: Category; label: string }[] = [
    { id: "all", label: "All" },
    { id: "tickets", label: "Tickets & Payments" },
    { id: "crm", label: "CRM" },
    { id: "analytics", label: "Analytics" },
  ];

  const filtered =
    activeTab === "all"
      ? integrations
      : integrations.filter((i) => i.category === activeTab);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect your favorite tools to enhance your support workflow
        </p>
      </div>

      <div className="bg-muted mb-6 flex w-fit gap-1 rounded-lg p-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === cat.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((integration) => (
          <div
            key={integration.name}
            className={cn(
              "rounded-lg border p-5 transition-colors",
              integration.connected
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-muted-foreground/50",
            )}
          >
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg text-2xl">
                  {integration.logo}
                </div>
                <div>
                  <h3 className="font-semibold">{integration.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {integration.category.charAt(0).toUpperCase() +
                      integration.category.slice(1)}
                  </p>
                </div>
              </div>
              {integration.connected && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Connected
                </span>
              )}
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              {integration.description}
            </p>
            <button
              className={cn(
                "w-full rounded-md px-4 py-2 text-sm font-medium",
                integration.connected
                  ? "border-destructive/50 text-destructive hover:bg-destructive/10 border"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {integration.connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <SettingsSection title="API Access">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">API Key</p>
                <p className="text-muted-foreground text-sm">
                  Use this key to authenticate API requests
                </p>
              </div>
              <button className="text-primary text-sm hover:underline">
                Generate new key
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                readOnly
                value="sk_live_••••••••••••••••••••••••"
                className="border-input bg-muted flex h-10 flex-1 rounded-md border px-3 py-2 font-mono text-sm"
              />
              <button className="bg-secondary hover:bg-secondary/80 rounded-md px-4 py-2 text-sm font-medium">
                Copy
              </button>
            </div>
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-foreground/80 text-sm font-semibold">{title}</h3>
      <div className="border-border bg-card rounded-lg border p-5">
        {children}
      </div>
    </div>
  );
}
