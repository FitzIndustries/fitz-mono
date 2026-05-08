import { createFileRoute } from "@tanstack/react-router";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const isZeroReady = useIsZeroReady();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
            Customers
          </p>
          <h1 className="mt-4 text-3xl font-bold">Customer directory</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Recent customers from the current organization, loaded through Zero.
          </p>
        </div>
      </div>

      {isZeroReady ? (
        <CustomerList />
      ) : (
        <p className="mt-8 text-sm text-slate-500">Loading customers...</p>
      )}
    </section>
  );
}

function CustomerList() {
  const [customers] = useZeroQuery(queries.support.customers());

  if (customers.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold">No customers yet</h2>
        <p className="mt-2 text-sm text-slate-600">
          Customers will appear here once conversations are created.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-slate-200">
      <div className="grid grid-cols-[1.4fr_1fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
        <span>Customer</span>
        <span>Contact</span>
        <span className="text-right">Conversations</span>
      </div>
      <div className="divide-y divide-slate-200">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="grid grid-cols-[1.4fr_1fr_0.8fr] items-center px-4 py-4 text-sm"
          >
            <div>
              <p className="font-semibold text-slate-950">
                {customer.name ?? "Unnamed customer"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{customer.id}</p>
            </div>
            <div className="text-slate-600">
              <p>{customer.email ?? "No email"}</p>
              <p className="mt-1 text-xs">{customer.phone ?? "No phone"}</p>
            </div>
            <p className="text-right font-semibold text-slate-950">
              {customer.conversations.length}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
