import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/billing")({
  component: BillingPage,
});

function BillingPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading billing...</p>;
  }

  return <BillingSettings />;
}

function BillingSettings() {
  const [organization] = useZeroQuery(queries.support.channels());

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading billing...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Billing</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Read-only billing and subscription details loaded through Zero.
          Checkout and portal actions will be restored later.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <BillingCard label="Plan" value={organization.plan ?? "starter"} />
        <BillingCard
          label="Seats"
          value={`${String(organization.seatUsed ?? 0)} / ${String(
            organization.seatLimit ?? 0,
          )}`}
        />
        <BillingCard
          label="Stripe customer"
          value={organization.stripeCustomerId ?? "Not connected"}
        />
        <BillingCard
          label="Subscription"
          value={organization.stripeSubscriptionId ?? "No subscription"}
        />
      </div>
    </div>
  );
}

function BillingCard({ label, value }: { label: string; value: string }) {
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
