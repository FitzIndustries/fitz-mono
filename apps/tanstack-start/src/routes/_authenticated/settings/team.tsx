import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/team")({
  component: TeamPage,
});

function TeamPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading team...</p>;
  }

  return <TeamSettings />;
}

function TeamSettings() {
  const { userId } = Route.useRouteContext();
  const [members] = useZeroQuery(queries.support.members());
  const zero = useZero();
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold">No team members found</h2>
        <p className="mt-2 text-sm text-slate-600">
          Members will appear here once organization access is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Team members</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Organization membership loaded through Zero. Role changes update the
          local database immediately and sync automatically.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-200">
          {members.map((member) => {
            const isCurrentUser = member.userId === userId;

            return (
              <div
                key={member.id}
                className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center px-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {member.userId}
                    {isCurrentUser ? " (you)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{member.id}</p>
                </div>
                <RoleSelect
                  disabled={isCurrentUser || savingMemberId === member.id}
                  role={member.role ?? "viewer"}
                  onChange={(role) =>
                    void updateMemberRole({ memberId: member.id, role })
                  }
                />
                <p className="font-semibold text-slate-950">
                  {member.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  async function updateMemberRole({
    memberId,
    role,
  }: {
    memberId: string;
    role: TeamRole;
  }) {
    setError(null);
    setSavingMemberId(memberId);

    try {
      const write = zero.mutate(
        mutators.team.updateMemberRole({ memberId, role }),
      );
      const result = await write.client;

      if (result.type === "error") {
        setError(result.error.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update team role",
      );
    } finally {
      setSavingMemberId(null);
    }
  }
}

type TeamRole = "owner" | "admin" | "agent" | "viewer";

const teamRoles: TeamRole[] = ["owner", "admin", "agent", "viewer"];

function RoleSelect({
  disabled,
  onChange,
  role,
}: {
  disabled: boolean;
  onChange: (role: TeamRole) => void;
  role: TeamRole;
}) {
  return (
    <select
      value={role}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as TeamRole)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    >
      {teamRoles.map((teamRole) => (
        <option key={teamRole} value={teamRole}>
          {teamRole.charAt(0).toUpperCase() + teamRole.slice(1)}
        </option>
      ))}
    </select>
  );
}
