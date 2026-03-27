import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { apiFetch } from "~/lib/api";

export const Route = createFileRoute("/settings/billing")({
  component: BillingSettings,
});

interface BillingResponse {
  billing: {
    id: string;
    plan: "starter" | "pro" | "enterprise" | null;
    seatLimit: number | null;
    seatUsed: number | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  } | null;
}

const plans = [
  { id: "starter", name: "Starter", defaultSeats: 3, price: 29 },
  { id: "pro", name: "Pro", defaultSeats: 10, price: 99 },
  { id: "enterprise", name: "Enterprise", defaultSeats: 50, price: 299 },
] as const;

function BillingSettings() {
  const queryClient = useQueryClient();
  const billingQuery = useQuery({
    queryKey: ["billing-settings"],
    queryFn: () => apiFetch<BillingResponse>("/api/billing"),
  });

  const saveBilling = useMutation({
    mutationFn: (payload: {
      plan: "starter" | "pro" | "enterprise";
      seatLimit: number;
    }) =>
      apiFetch<BillingResponse>("/api/billing", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["billing-settings"] }),
        queryClient.invalidateQueries({ queryKey: ["team-members"] }),
      ]);
    },
  });

  const billing = billingQuery.data?.billing;
  const currentPlan = billing?.plan ?? "starter";
  const seatLimit = billing?.seatLimit ?? 3;
  const seatUsed = billing?.seatUsed ?? 0;

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Billing</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your workspace plan and seat capacity.
        </p>
      </div>

      <section className="mb-8 rounded-lg border p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold">
              Current plan: {labelForPlan(currentPlan)}
            </p>
            <p className="text-muted-foreground text-sm">
              {seatUsed} of {seatLimit} seats in use
            </p>
          </div>
          <div className="text-right text-sm">
            <p>
              Stripe customer: {billing?.stripeCustomerId ?? "Not connected"}
            </p>
            <p className="text-muted-foreground">
              Subscription: {billing?.stripeSubscriptionId ?? "Not connected"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <form
              key={plan.id}
              className={`rounded-lg border p-5 ${isCurrent ? "border-primary bg-primary/5" : ""}`}
              onSubmit={(event) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                const nextSeatLimit = Number.parseInt(
                  getFormString(
                    formData,
                    "seatLimit",
                    String(plan.defaultSeats),
                  ),
                  10,
                );

                void saveBilling.mutate({
                  plan: plan.id,
                  seatLimit: Number.isNaN(nextSeatLimit)
                    ? plan.defaultSeats
                    : nextSeatLimit,
                });
              }}
            >
              <div className="mb-4">
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  ${plan.price}/month
                </p>
              </div>
              <ul className="mb-4 space-y-2 text-sm">
                <li>{plan.defaultSeats}+ team seats</li>
                <li>Email + WhatsApp channels</li>
                <li>Shared realtime inbox</li>
              </ul>
              <label className="mb-4 block text-sm font-medium">
                Seat limit
                <input
                  name="seatLimit"
                  type="number"
                  min={seatUsed || 1}
                  defaultValue={isCurrent ? seatLimit : plan.defaultSeats}
                  className="border-input bg-background mt-2 h-10 w-full rounded-md border px-3"
                />
              </label>
              <button
                type="submit"
                className="bg-primary text-primary-foreground w-full rounded-md px-4 py-2 text-sm font-medium"
                disabled={saveBilling.isPending}
              >
                {isCurrent ? "Update plan" : `Switch to ${plan.name}`}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}

function labelForPlan(plan: "starter" | "pro" | "enterprise") {
  switch (plan) {
    case "starter":
      return "Starter";
    case "pro":
      return "Pro";
    case "enterprise":
      return "Enterprise";
  }
}

function getFormString(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}
