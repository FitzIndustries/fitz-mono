import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { getViewer } from "~/lib/viewer";

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
    <BaselinePage
      title="Dashboard route is rendering"
      userId={userId}
      organizationName={viewer?.currentOrganization?.name ?? "No organization"}
    />
  );
}

function BaselinePage({
  title,
  userId,
  organizationName,
}: {
  title: string;
  userId: string;
  organizationName: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-950">
      <div className="max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Baseline Render Check
        </p>
        <h1 className="mt-4 text-3xl font-bold">{title}</h1>
        <p className="mt-4 break-all text-sm text-slate-600">User: {userId}</p>
        <p className="mt-2 text-sm text-slate-600">
          Organization: {organizationName}
        </p>
      </div>
    </main>
  );
}
