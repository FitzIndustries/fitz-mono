import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  return <div className="p-8 text-slate-950">Customers route is rendering</div>;
}
