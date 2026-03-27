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
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">Your Profile</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your personal information and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
          <CardDescription>
            Your identity follows you across every workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <div className="bg-primary/10 text-primary flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold">
              {initials}
            </div>
            <Button
              size="icon"
              className="absolute -right-1 -bottom-1 rounded-full"
            >
              <Camera className="size-4" />
            </Button>
          </div>
          <div>
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-muted-foreground text-sm">{user.email}</p>
            <Button variant="link" className="mt-1 h-auto px-0 text-sm">
              Change photo
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Contact your administrator to update your account identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>First Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={nameParts[0] ?? ""}
                    readOnly
                    className="bg-muted opacity-70"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel>Last Name</FieldLabel>
                <FieldContent>
                  <Input
                    value={nameParts.slice(1).join(" ") || ""}
                    readOnly
                    className="bg-muted opacity-70"
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
                  className="bg-muted opacity-70"
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

      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Personal defaults for how you work inside the support platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
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
            <Field orientation="horizontal">
              <Checkbox
                checked={emailNotifications}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setEmailNotifications(checked === true)
                }
              />
              <FieldContent>
                <FieldLabel>Email notifications</FieldLabel>
                <FieldDescription>
                  Receive daily digests of support activity.
                </FieldDescription>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                checked={desktopNotifications}
                onCheckedChange={(checked: boolean | "indeterminate") =>
                  setDesktopNotifications(checked === true)
                }
              />
              <FieldContent>
                <FieldLabel>Desktop notifications</FieldLabel>
                <FieldDescription>
                  Get notified when new customer messages arrive.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Authentication and device access for this account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-muted-foreground text-sm">
                Last changed 3 months ago
              </p>
            </div>
            <Button variant="outline">Change password</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-muted-foreground text-sm">
                Add an extra layer of security
              </p>
            </div>
            <Button variant="outline">Enable 2FA</Button>
          </div>
          <div className="flex items-center justify-between border-t pt-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Theme selection is synced in real time through Zero.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Theme</FieldLabel>
              <FieldContent>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={themeMode === "light" ? "default" : "outline"}
                    className={cn(
                      "h-auto flex-col gap-2 py-4",
                      themeMode === "light" && "ring-primary ring-2",
                    )}
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="size-5 text-amber-500" />
                    Light
                  </Button>
                  <Button
                    type="button"
                    variant={themeMode === "dark" ? "default" : "outline"}
                    className={cn(
                      "h-auto flex-col gap-2 py-4",
                      themeMode === "dark" && "ring-primary ring-2",
                    )}
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="size-5" />
                    Dark
                  </Button>
                  <Button
                    type="button"
                    variant={themeMode === "auto" ? "default" : "outline"}
                    className={cn(
                      "h-auto flex-col gap-2 py-4",
                      themeMode === "auto" && "ring-primary ring-2",
                    )}
                    onClick={() => setTheme("auto")}
                  >
                    <span className="text-sm font-medium">Auto</span>
                    System
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
