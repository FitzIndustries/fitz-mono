import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

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
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Team</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Add teammates who already have accounts and manage their access.
        </p>
      </div>

      <div className="space-y-8">
        <section className="space-y-4 rounded-lg border p-5">
          <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Add Team Member
          </h3>
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const formData = new FormData(event.currentTarget);
              void addMember
                .mutateAsync({
                  email: getFormString(formData, "email"),
                  role: getFormString(
                    formData,
                    "role",
                    "agent",
                  ) as TeamMember["role"],
                })
                .then(() => form.reset());
            }}
          >
            <input
              name="email"
              type="email"
              placeholder="colleague@company.com"
              className="border-input bg-background h-10 min-w-72 flex-1 rounded-md border px-3 text-sm"
            />
            <select
              name="role"
              defaultValue="agent"
              className="border-input bg-background h-10 rounded-md border px-3 text-sm"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
              <option value="owner">Owner</option>
            </select>
            <button
              type="submit"
              className="bg-primary text-primary-foreground rounded-md px-4 text-sm font-medium"
              disabled={addMember.isPending}
            >
              {addMember.isPending ? "Adding..." : "Add member"}
            </button>
          </form>
          {addMember.error ? (
            <p className="text-sm text-red-600">{addMember.error.message}</p>
          ) : null}
        </section>

        <section className="space-y-4 rounded-lg border p-5">
          <h3 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Members
          </h3>
          <div className="space-y-3">
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
                  <select
                    value={member.role}
                    onChange={(event) => {
                      void updateMember.mutateAsync({
                        memberId: member.id,
                        role: event.target.value as TeamMember["role"],
                      });
                    }}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                  >
                    <option value="owner">Owner</option>
                    <option value="admin">Admin</option>
                    <option value="agent">Agent</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={member.isActive}
                      onChange={(event) => {
                        void updateMember.mutateAsync({
                          memberId: member.id,
                          isActive: event.target.checked,
                        });
                      }}
                    />
                    Active
                  </label>
                </div>
              </div>
            ))}
            {!teamQuery.data?.members.length ? (
              <p className="text-muted-foreground text-sm">
                No team members yet.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function getFormString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}
