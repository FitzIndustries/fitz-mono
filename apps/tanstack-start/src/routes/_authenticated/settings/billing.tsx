import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings/billing")({
  component: BillingPage,
});

function BillingPage() {
  return <p className="mt-4">Billing route is rendering</p>;
}
