import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { cn } from "@fitzindustries/ui";
import { useTheme } from "@fitzindustries/ui/theme";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/settings/")({
  component: ProfileSettings,
});

function ProfileSettings() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState("America/New_York");
  const { themeMode, setTheme } = useTheme();

  const user = session?.user;
  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/login", replace: true });
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold">Your Profile</h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-24 w-24 rounded-full" />
          <div className="bg-muted h-6 w-32 rounded" />
          <div className="bg-muted h-4 w-48 rounded" />
        </div>
      </div>
    );
  }

  if (!user) return null;

  const nameParts = user.name.split(" ");
  const initials = nameParts[0]
    ? nameParts
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Your Profile</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="mb-8 flex items-center gap-6">
        <div className="relative">
          <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold">
            {initials}
          </div>
          <button className="bg-primary text-primary-foreground hover:bg-primary/90 absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full shadow-sm">
            <CameraIcon className="size-4" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-semibold">{user.name}</h3>
          <p className="text-muted-foreground text-sm">{user.email}</p>
          <button className="text-primary mt-1 text-sm hover:underline">
            Change photo
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <SettingsSection title="Personal Information">
          <div className="grid grid-cols-2 gap-4">
            <SettingsField label="First Name">
              <input
                type="text"
                value={nameParts[0] ?? ""}
                readOnly
                className="border-input bg-muted flex h-10 w-full cursor-not-allowed rounded-md border px-3 py-2 text-sm opacity-70"
              />
            </SettingsField>
            <SettingsField label="Last Name">
              <input
                type="text"
                value={nameParts.slice(1).join(" ") || ""}
                readOnly
                className="border-input bg-muted flex h-10 w-full cursor-not-allowed rounded-md border px-3 py-2 text-sm opacity-70"
              />
            </SettingsField>
          </div>
          <SettingsField label="Email Address">
            <input
              type="email"
              value={user.email}
              readOnly
              className="border-input bg-muted flex h-10 w-full cursor-not-allowed rounded-md border px-3 py-2 text-sm opacity-70"
            />
          </SettingsField>
          <p className="text-muted-foreground text-xs">
            Contact your administrator to update your personal information.
          </p>
        </SettingsSection>

        <SettingsSection title="Preferences">
          <SettingsField label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
            </select>
          </SettingsField>
          <SettingsField label="Language">
            <select className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
            </select>
          </SettingsField>
          <ToggleField
            label="Email notifications"
            description="Receive daily digest of support activity"
            defaultChecked
          />
          <ToggleField
            label="Desktop notifications"
            description="Get notified when new messages arrive"
            defaultChecked
          />
        </SettingsSection>

        <SettingsSection title="Security">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Password</p>
                <p className="text-muted-foreground text-sm">
                  Last changed 3 months ago
                </p>
              </div>
              <button className="border-input bg-background hover:bg-muted rounded-md border px-4 py-2 text-sm font-medium">
                Change password
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Two-factor authentication</p>
                <p className="text-muted-foreground text-sm">
                  Add an extra layer of security
                </p>
              </div>
              <button className="border-primary bg-primary/10 text-primary hover:bg-primary/20 rounded-md border px-4 py-2 text-sm font-medium">
                Enable 2FA
              </button>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-medium">Sign out</p>
                <p className="text-muted-foreground text-sm">
                  Sign out of your account on this device
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="border-destructive/50 text-destructive hover:bg-destructive/10 rounded-md border px-4 py-2 text-sm font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Appearance">
          <div className="space-y-4">
            <SettingsField label="Theme">
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme("light")}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    themeMode === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                    <SunIcon className="size-5 text-amber-500" />
                  </div>
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button
                  onClick={() => setTheme("dark")}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    themeMode === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50",
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 shadow-sm">
                    <MoonIcon className="size-5 text-zinc-400" />
                  </div>
                  <span className="text-sm font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setTheme("auto")}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors",
                    themeMode === "auto"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50",
                  )}
                >
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-white to-zinc-900 shadow-sm">
                    <div className="absolute left-1 flex h-8 w-4 items-center justify-center rounded-l bg-white">
                      <MoonIcon className="size-3 text-zinc-400" />
                    </div>
                    <div className="absolute right-1 flex h-8 w-4 items-center justify-center rounded-r bg-zinc-900">
                      <SunIcon className="size-3 text-amber-500" />
                    </div>
                  </div>
                  <span className="text-sm font-medium">System</span>
                </button>
              </div>
            </SettingsField>
          </div>
        </SettingsSection>
      </div>

      <div className="mt-8 flex justify-end">
        <button className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-2.5 text-sm font-medium shadow-sm">
          Save changes
        </button>
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

function SettingsField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-foreground/80 text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ToggleField({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={defaultChecked}
        className={cn(
          "peer focus-visible:ring-ring focus-visible:ring-offset-background inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          defaultChecked ? "bg-primary" : "bg-muted-foreground/20",
        )}
      >
        <span
          className={cn(
            "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform",
            defaultChecked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
