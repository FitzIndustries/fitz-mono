import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Moon, Sun } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  cn,
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@fitzindustries/ui";
import { useTheme } from "@fitzindustries/ui/theme";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/settings/")({
  component: ProfileSettings,
});

function ProfileSettings() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [timezone, setTimezone] = useState("America/New_York");
  const [language, setLanguage] = useState("English");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const { themeMode, setTheme } = useTheme();

  const user = session?.user;
  const handleSignOut = async () => {
    await authClient.signOut();
    await navigate({ to: "/login", replace: true });
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <div className="animate-pulse space-y-4">
          <div className="bg-muted h-10 w-48 rounded" />
          <div className="bg-muted h-40 rounded-xl" />
          <div className="bg-muted h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const nameParts = user.name.split(" ");
  const initials = nameParts[0]
    ? nameParts
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-8">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Your Profile</h2>
        <p className="text-muted-foreground mt-2 text-base">
          Manage your personal information and preferences.
        </p>
      </div>

      <Card className="border-border/60 bg-card/70 gap-0 py-0 shadow-none backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl">Profile Overview</CardTitle>
          <CardDescription>
            Your identity follows you across every workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6 pb-6">
          <div className="relative">
            <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold shadow-inner">
              {initials}
            </div>
            <Button
              size="icon-sm"
              variant="secondary"
              className="border-border/70 absolute -right-1 -bottom-1 rounded-full border shadow-sm"
            >
              <Camera className="size-4" />
            </Button>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <Button variant="link" className="text-primary h-auto px-0 text-sm">
              Change photo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70 gap-0 py-0 shadow-none backdrop-blur-sm">
        <CardHeader className="pb-5">
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Contact your administrator to update your account identity.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <FieldGroup className="gap-5">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>First Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={nameParts[0] ?? ""}
                    readOnly
                    className="border-border/70 bg-muted/60 opacity-80"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Last Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={nameParts.slice(1).join(" ") || ""}
                    readOnly
                    className="border-border/70 bg-muted/60 opacity-80"
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel>Email Address</FieldLabel>
              <FieldContent>
                <Input
                  value={user.email}
                  readOnly
                  className="border-border/70 bg-muted/60 opacity-80"
                />
                <FieldDescription>
                  This email is managed through authentication and workspace
                  membership.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70 gap-0 py-0 shadow-none backdrop-blur-sm">
        <CardHeader className="pb-5">
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Personal defaults for how you work inside the support platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel>Timezone</FieldLabel>
              <FieldContent>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">
                      Eastern Time (ET)
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time (CT)
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time (MT)
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time (PT)
                    </SelectItem>
                    <SelectItem value="Europe/London">London (GMT)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
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
            <Separator />
            <label className="border-border/60 flex items-start gap-4 rounded-lg border px-4 py-3">
              <Checkbox
                checked={emailNotifications}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setEmailNotifications(checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <div className="text-sm leading-none font-medium">
                  Email notifications
                </div>
                <p className="text-muted-foreground text-sm">
                  Receive daily digests of support activity.
                </p>
              </div>
            </label>
            <label className="border-border/60 flex items-start gap-4 rounded-lg border px-4 py-3">
              <Checkbox
                checked={desktopNotifications}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setDesktopNotifications(checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-1">
                <div className="text-sm leading-none font-medium">
                  Desktop notifications
                </div>
                <p className="text-muted-foreground text-sm">
                  Get notified when new customer messages arrive.
                </p>
              </div>
            </label>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70 gap-0 py-0 shadow-none backdrop-blur-sm">
        <CardHeader className="pb-5">
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Authentication and device access for this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6">
          <div className="border-border/60 flex items-center justify-between rounded-lg border px-4 py-4">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-muted-foreground text-sm">
                Last changed 3 months ago
              </p>
            </div>
            <Button variant="outline">Change password</Button>
          </div>
          <div className="border-border/60 flex items-center justify-between rounded-lg border px-4 py-4">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-muted-foreground text-sm">
                Add an extra layer of security
              </p>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>
          <div className="border-destructive/30 flex items-center justify-between rounded-lg border px-4 py-4">
            <div>
              <p className="font-medium">Sign out</p>
              <p className="text-muted-foreground text-sm">
                Sign out of your account on this device
              </p>
            </div>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/70 gap-0 py-0 shadow-none backdrop-blur-sm">
        <CardHeader className="pb-5">
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Theme selection is synced in real time through Zero.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <FieldGroup>
            <Field>
              <FieldLabel>Theme</FieldLabel>
              <FieldContent>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={themeMode === "light" ? "default" : "outline"}
                    className={cn(
                      "h-auto min-h-28 flex-col gap-3 rounded-xl py-4",
                      themeMode === "light" && "ring-primary ring-2",
                    )}
                    onClick={() => setTheme("light")}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-white text-amber-500 shadow-sm">
                      <Sun className="size-5" />
                    </div>
                    <span>Light</span>
                  </Button>
                  <Button
                    type="button"
                    variant={themeMode === "dark" ? "default" : "outline"}
                    className={cn(
                      "h-auto min-h-28 flex-col gap-3 rounded-xl py-4",
                      themeMode === "dark" && "ring-primary ring-2",
                    )}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-950 text-zinc-100 shadow-sm">
                      <Moon className="size-5" />
                    </div>
                    <span>Dark</span>
                  </Button>
                  <Button
                    type="button"
                    variant={themeMode === "auto" ? "default" : "outline"}
                    className={cn(
                      "h-auto min-h-28 flex-col gap-3 rounded-xl py-4",
                      themeMode === "auto" && "ring-primary ring-2",
                    )}
                    onClick={() => setTheme("auto")}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-white to-zinc-900 text-sm font-semibold text-zinc-950 shadow-sm">
                      <span className="mix-blend-screen">A</span>
                    </div>
                    <span>System</span>
                  </Button>
                </div>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button>Save changes</Button>
      </div>
    </div>
  );
}
