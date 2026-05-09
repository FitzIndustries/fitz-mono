import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/organization")({
  component: OrganizationPage,
});

function OrganizationPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading organization...</p>;
  }

  return <OrganizationSettings />;
}

function OrganizationSettings() {
  const [organization] = useZeroQuery(queries.support.channels());

  if (!organization) {
    return <p className="text-sm text-slate-500">Loading organization...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Organization profile</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Read-only organization details loaded through Zero. Editing will be
          restored after the read path is stable.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DetailCard label="Name" value={organization.name} />
        <DetailCard label="Slug" value={organization.slug} />
        <DetailCard label="Plan" value={organization.plan ?? "starter"} />
        <DetailCard
          label="Status"
          value={organization.isActive ? "Active" : "Inactive"}
        />
        <DetailCard
          label="Seats used"
          value={String(organization.seatUsed ?? 0)}
        />
        <DetailCard
          label="Seat limit"
          value={String(organization.seatLimit ?? 0)}
        />
      </div>

      <OrganizationForm
        key={organization.id}
        name={organization.name}
        slug={organization.slug}
      />
    </div>
  );
}

function OrganizationForm({ name, slug }: { name: string; slug: string }) {
  const zero = useZero();
  const [formName, setFormName] = useState(name);
  const [formSlug, setFormSlug] = useState(slug);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSaving(true);

    const write = zero.mutate(
      mutators.organization.updateProfile({
        name: formName,
        slug: formSlug,
      }),
    );
    const result = await write.client;

    setIsSaving(false);

    if (result.type === "error") {
      setError(result.error.message);
      return;
    }

    setMessage("Organization saved locally and will sync automatically.");
  };

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="rounded-xl border border-slate-200 bg-white p-5"
    >
      <h3 className="text-lg font-semibold">Edit organization</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Updates are written through Zero, so the local database and active views
        update immediately.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Name</span>
          <input
            value={formName}
            onChange={(event) => setFormName(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Slug</span>
          <input
            value={formSlug}
            onChange={(event) => setFormSlug(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm transition outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isSaving ? "Saving..." : "Save organization"}
      </button>
    </form>
  );
}

function DetailCard({ label, value }: { label: string; value: string }) {
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
