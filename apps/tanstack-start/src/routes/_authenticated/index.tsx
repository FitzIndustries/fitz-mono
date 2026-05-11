import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { queries } from "@fitzindustries/zero-shared";
import { useQuery as useZeroQuery } from "@fitzindustries/zero-shared/react";

import { getViewer } from "~/lib/viewer";
import { useIsZeroReady } from "~/providers/zero-provider";

const dashboardSearchSchema = z.object({
  org: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/")({
  validateSearch: dashboardSearchSchema,
  loaderDeps: ({ search }) => ({ org: search.org }),
  loader: async ({ deps }) => {
    const viewer = await getViewer(deps.org);

    return { viewer };
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { userId } = Route.useRouteContext();
  const { viewer } = Route.useLoaderData();

  return (
    <DashboardSummary
      userId={userId}
      fallbackOrganizationName={
        viewer.currentOrganization?.name ?? "Organization"
      }
    />
  );
}

function DashboardSummary({
  userId,
  fallbackOrganizationName,
}: {
  userId: string;
  fallbackOrganizationName: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Dashboard
        </p>
        <h1 className="mt-4 text-3xl font-bold">Organization overview</h1>
        <p className="mt-4 text-sm break-all text-slate-600">User: {userId}</p>
        <ZeroOrganizationSummary fallbackName={fallbackOrganizationName} />
      </div>
    </section>
  );
}

function ZeroOrganizationSummary({ fallbackName }: { fallbackName: string }) {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return (
      <p className="mt-6 text-sm text-slate-500">Loading {fallbackName}...</p>
    );
  }

  return <ActiveZeroOrganizationSummary fallbackName={fallbackName} />;
}

function ActiveZeroOrganizationSummary({
  fallbackName,
}: {
  fallbackName: string;
}) {
  const [organization] = useZeroQuery(queries.support.channels());

  if (!organization) {
    return (
      <p className="mt-6 text-sm text-slate-500">Loading {fallbackName}...</p>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <SummaryStat label="Organization" value={organization.name} />
      <SummaryStat
        label="WhatsApp channels"
        value={String(organization.whatsappChannels.length)}
      />
      <SummaryStat
        label="Email channels"
        value={String(organization.emailChannels.length)}
      />
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-500 uppercase">
        {label}
      </p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}
