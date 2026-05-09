import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  component: OrganizationPage,
});

function OrganizationPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading organization...</p>;
  }

  return <OrganizationSettings />;
}

function OrganizationSettings() {
  const [organization] = useZeroQuery(queries.support.channels());

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading organization...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Organization profile</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Read-only organization details loaded through Zero. Editing will be
          restored after the read path is stable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard label="Name" value={organization.name} />
        <DetailCard label="Slug" value={organization.slug} />
        <DetailCard label="Plan" value={organization.plan ?? "starter"} />
        <DetailCard
          label="Status"
          value={organization.isActive ? "Active" : "Inactive"}
        />
        <DetailCard
          label="Seats used"
          value={String(organization.seatUsed ?? 0)}
        />
        <DetailCard
          label="Seat limit"
          value={String(organization.seatLimit ?? 0)}
        />
      </div>
    </div>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold break-words text-slate-950">
        {value}
      </p>
    </div>
  );
}
