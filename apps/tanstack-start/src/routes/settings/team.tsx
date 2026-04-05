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

import { apiFetch } from "~/lib/api";

export const Route = createFileRoute("/settings/team")({
  component: TeamSettings,
});

interface TeamMember {
  id: string;
  userId: string;
  role: "owner" | "admin" | "agent" | "viewer";
  isActive: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
}

function TeamSettings() {
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamMember["role"]>("agent");
  const teamQuery = useQuery({
    queryKey: ["team-members"],
    queryFn: () => apiFetch<{ members: TeamMember[] }>("/api/team"),
  });

  const addMember = useMutation({
    mutationFn: (payload: { email: string; role: TeamMember["role"] }) =>
      apiFetch<{ member: TeamMember }>("/api/team", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      setInviteEmail("");
      await queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });

  const updateMember = useMutation({
    mutationFn: ({
      memberId,
      role,
      isActive,
    }: {
      memberId: string;
      role?: TeamMember["role"];
      isActive?: boolean;
    }) =>
      apiFetch<{ member: TeamMember }>(`/api/team/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role, isActive }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["team-members"] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">Team</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Add teammates who already have accounts and manage their access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Team Member</CardTitle>
          <CardDescription>
            Invite an existing user into this workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <FieldContent>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="colleague@company.com"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Role</FieldLabel>
              <FieldContent>
                <Select
                  value={inviteRole}
                  onValueChange={(value: TeamMember["role"]) =>
                    setInviteRole(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <div className="flex items-center justify-between">
              <div className="text-sm text-red-600">
                {addMember.error?.message ?? ""}
              </div>
              <Button
                onClick={() => {
                  void addMember.mutateAsync({
                    email: inviteEmail,
                    role: inviteRole,
                  });
                }}
                disabled={addMember.isPending || inviteEmail.length === 0}
              >
                {addMember.isPending ? "Adding..." : "Add member"}
              </Button>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Roles and activation state are applied immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {teamQuery.data?.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4"
            >
              <div>
                <p className="font-medium">
                  {member.user?.name ?? "Unknown user"}
                </p>
                <p className="text-muted-foreground text-sm">
                  {member.user?.email ?? "No email available"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={member.role}
                  onValueChange={(value: TeamMember["role"]) => {
                    void updateMember.mutateAsync({
                      memberId: member.id,
                      role: value,
                    });
                  }}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Field orientation="horizontal" className="items-center gap-2">
                  <Checkbox
                    checked={member.isActive}
                    onCheckedChange={(checked: boolean | "indeterminate") => {
                      void updateMember.mutateAsync({
                        memberId: member.id,
                        isActive: checked === true,
                      });
                    }}
                  />
                  <FieldContent>
                    <FieldLabel>Active</FieldLabel>
                  </FieldContent>
                </Field>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
