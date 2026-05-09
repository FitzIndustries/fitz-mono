import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

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
  const [members] = useZeroQuery(queries.support.members());

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
          Read-only organization membership loaded through Zero. Invites and
          role changes will be restored after the read path is stable.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-200">
          {members.map((member) => (
            <div
              key={member.id}
              className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center px-4 py-4 text-sm"
            >
              <div>
                <p className="font-semibold text-slate-950">{member.userId}</p>
                <p className="mt-1 text-xs text-slate-500">{member.id}</p>
              </div>
              <p className="text-slate-600">{formatLabel(member.role)}</p>
              <p className="font-semibold text-slate-950">
                {member.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatLabel(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
