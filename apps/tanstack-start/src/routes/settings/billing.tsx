import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldContent,
  FieldLabel,
  Input,
} from "@fitzindustries/ui";

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
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold">Billing</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your workspace plan and seat capacity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            Seat usage is enforced when members are added or reactivated.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
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
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <Card
              key={plan.id}
              className={isCurrent ? "border-primary bg-primary/5" : undefined}
            >
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>${plan.price}/month</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  <li>{plan.defaultSeats}+ team seats</li>
                  <li>Email + WhatsApp channels</li>
                  <li>Shared realtime inbox</li>
                </ul>
                <Field>
                  <FieldLabel>Seat limit</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={seatUsed || 1}
                      defaultValue={isCurrent ? seatLimit : plan.defaultSeats}
                      id={`seat-limit-${plan.id}`}
                    />
                  </FieldContent>
                </Field>
                <Button
                  className="w-full"
                  onClick={() => {
                    const input = document.getElementById(
                      `seat-limit-${plan.id}`,
                    ) as HTMLInputElement | null;
                    const nextSeatLimit = Number.parseInt(
                      input?.value ?? String(plan.defaultSeats),
                      10,
                    );
                    void saveBilling.mutate({
                      plan: plan.id,
                      seatLimit: Number.isNaN(nextSeatLimit)
                        ? plan.defaultSeats
                        : nextSeatLimit,
                    });
                  }}
                  disabled={saveBilling.isPending}
                >
                  {isCurrent ? "Update plan" : `Switch to ${plan.name}`}
                </Button>
              </CardContent>
            </Card>
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
