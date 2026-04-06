import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "@fitzindustries/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@fitzindustries/ui/components/card";
import { Input } from "@fitzindustries/ui/components/input";
import { cn } from "@fitzindustries/ui/lib/utils";

export const Route = createFileRoute("/_authenticated/settings/integrations")({
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
      : integrations.filter(
          (integration) => integration.category === activeTab,
        );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">Integrations</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect your favorite tools to enhance your support workflow.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={activeTab === category.id ? "default" : "outline"}
            onClick={() => setActiveTab(category.id)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filtered.map((integration) => (
          <Card
            key={integration.name}
            className={cn(
              integration.connected && "border-primary bg-primary/5",
            )}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg text-2xl">
                    {integration.logo}
                  </div>
                  <div>
                    <CardTitle>{integration.name}</CardTitle>
                    <CardDescription>
                      {integration.category.charAt(0).toUpperCase() +
                        integration.category.slice(1)}
                    </CardDescription>
                  </div>
                </div>
                {integration.connected ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Connected
                  </span>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                {integration.description}
              </p>
              <Button
                className="w-full"
                variant={integration.connected ? "outline" : "default"}
              >
                {integration.connected ? "Disconnect" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Access</CardTitle>
          <CardDescription>
            Use this key to authenticate API requests.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">API Key</p>
              <p className="text-muted-foreground text-sm">
                Generate a fresh key any time access needs to rotate.
              </p>
            </div>
            <Button variant="link">Generate new key</Button>
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              readOnly
              value="sk_live_••••••••••••••••••••••••"
              className="bg-muted font-mono"
            />
            <Button variant="secondary">Copy</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
