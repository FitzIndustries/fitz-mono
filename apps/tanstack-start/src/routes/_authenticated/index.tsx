import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/")({
  component: DashboardPage,
});

function DashboardPage() {
  return <BaselinePage title="Dashboard route is rendering" />;
}

function BaselinePage({ title }: { title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-slate-950">
      <div className="max-w-md rounded-2xl border border-slate-200 p-8 shadow-sm">
        <p className="text-sm font-semibold tracking-[0.2em] text-slate-500 uppercase">
          Baseline Render Check
        </p>
        <h1 className="mt-4 text-3xl font-bold">{title}</h1>
      </div>
    </main>
  );
}
