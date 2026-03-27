import { createFileRoute, redirect } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { authClient } from "~/auth/client";

export const Route = createFileRoute("/customers")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw redirect({ to: "/login" });
    }
  },
  component: CustomersPage,
});

function CustomersPage() {
  const [customers] = useZeroQuery(queries.support.customers());

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Everyone who has contacted the support team across your active
          workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {customers.map((customer) => {
          const lastConversation = customer.conversations[0];
          return (
            <article key={customer.id} className="rounded-lg border p-5">
              <h2 className="font-semibold">
                {customer.name ?? "Unknown customer"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {customer.email ?? customer.phone ?? "No contact details"}
              </p>
              <div className="mt-4 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Conversations:</span>{" "}
                  {customer.conversations.length}
                </p>
                <p>
                  <span className="text-muted-foreground">Latest channel:</span>{" "}
                  {lastConversation?.channel ?? "-"}
                </p>
                <p>
                  <span className="text-muted-foreground">Latest status:</span>{" "}
                  {lastConversation?.status ?? "-"}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
