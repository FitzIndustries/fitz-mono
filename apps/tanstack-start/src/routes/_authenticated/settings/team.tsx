import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { mutators, queries } from "@fitzindustries/zero-shared";
import {
  useZero,
  useQuery as useZeroQuery,
} from "@fitzindustries/zero-shared/react";

import { makeTRPCClient } from "~/lib/trpc";
import { useIsZeroReady } from "~/providers/zero-provider";

export const Route = createFileRoute("/_authenticated/settings/team")({
  component: TeamPage,
});

function TeamPage() {
  const isZeroReady = useIsZeroReady();

  if (!isZeroReady) {
    return <p className="text-sm text-slate-500">Loading team...</p>;
  }

  return <TeamSettings />;
}

function TeamSettings() {
  const { userId } = Route.useRouteContext();
  const [members] = useZeroQuery(queries.support.members());
  const zero = useZero();
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const organizationId = members[0]?.organizationId ?? null;

  useEffect(() => {
    if (!organizationId) {
      setPendingInvites([]);
      return;
    }

    let isMounted = true;
    const trpc = makeTRPCClient();

    void trpc.teamInvites.pending
      .query({ organizationId })
      .then((result) => {
        if (isMounted) {
          setPendingInvites(result.invites);
        }
      })
      .catch((caughtError) => {
        if (isMounted) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Unable to load pending invites",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  if (members.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <h2 className="text-lg font-semibold">No team members found</h2>
        <p className="mt-2 text-sm text-slate-600">
          Members will appear here once organization access is configured.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-lg font-semibold">Team members</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Organization membership loaded through Zero. Role changes update the
          local database immediately and sync automatically. Invite links are
          generated through tRPC and can be shared manually until email delivery
          is wired in.
        </p>
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {inviteMessage ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {inviteMessage}
          </p>
        ) : null}
      </div>

      {organizationId ? (
        <InvitePanel
          organizationId={organizationId}
          pendingInvites={pendingInvites}
          onError={setError}
          onInvitesChange={setPendingInvites}
          onMessage={setInviteMessage}
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] bg-slate-50 px-4 py-3 text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        <div className="divide-y divide-slate-200">
          {members.map((member) => {
            const isCurrentUser = member.userId === userId;

            return (
              <div
                key={member.id}
                className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center px-4 py-4 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-950">
                    {member.userId}
                    {isCurrentUser ? " (you)" : ""}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{member.id}</p>
                </div>
                <RoleSelect
                  disabled={isCurrentUser || savingMemberId === member.id}
                  role={member.role ?? "viewer"}
                  onChange={(role) =>
                    void updateMemberRole({ memberId: member.id, role })
                  }
                />
                <p className="font-semibold text-slate-950">
                  {member.isActive ? "Active" : "Inactive"}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  async function updateMemberRole({
    memberId,
    role,
  }: {
    memberId: string;
    role: TeamRole;
  }) {
    setError(null);
    setSavingMemberId(memberId);

    try {
      const write = zero.mutate(
        mutators.team.updateMemberRole({ memberId, role }),
      );
      const result = await write.client;

      if (result.type === "error") {
        setError(result.error.message);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to update team role",
      );
    } finally {
      setSavingMemberId(null);
    }
  }
}

type TeamRole = "owner" | "admin" | "agent" | "viewer";
type InviteRole = Exclude<TeamRole, "owner">;
interface PendingInvite {
  id: string;
  email: string;
  role: InviteRole;
  expiresAt: Date;
  createdAt: Date;
}

const teamRoles: TeamRole[] = ["owner", "admin", "agent", "viewer"];
const inviteRoles: InviteRole[] = ["admin", "agent", "viewer"];

function InvitePanel({
  onError,
  onInvitesChange,
  onMessage,
  organizationId,
  pendingInvites,
}: {
  onError: (message: string | null) => void;
  onInvitesChange: (invites: PendingInvite[]) => void;
  onMessage: (message: string | null) => void;
  organizationId: string;
  pendingInvites: PendingInvite[];
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("agent");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingInviteId, setDeletingInviteId] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    onMessage(null);
    setInviteLink(null);
    setIsSaving(true);

    try {
      const trpc = makeTRPCClient();
      const result = await trpc.teamInvites.create.mutate({
        organizationId,
        email,
        role,
      });
      const link = `${window.location.origin}/accept-invite?token=${result.token}`;

      setInviteLink(link);
      setEmail("");
      onMessage("Invite link created. Email delivery will be wired in next.");
      onInvitesChange([
        {
          id: result.invite.id,
          email: result.invite.email,
          role: result.invite.role,
          expiresAt: result.invite.expiresAt,
          createdAt: new Date(),
        },
        ...pendingInvites.filter((invite) => invite.id !== result.invite.id),
      ]);
    } catch (caughtError) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to create invite",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function copyInviteLink() {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
    onMessage("Invite link copied to clipboard.");
  }

  async function deleteInvite(inviteId: string) {
    onError(null);
    onMessage(null);
    setDeletingInviteId(inviteId);

    try {
      const trpc = makeTRPCClient();
      await trpc.teamInvites.revoke.mutate({ organizationId, inviteId });
      onInvitesChange(
        pendingInvites.filter((invite) => invite.id !== inviteId),
      );
      onMessage("Pending invite deleted.");
    } catch (caughtError) {
      onError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete invite",
      );
    } finally {
      setDeletingInviteId(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold">Invite teammate</h3>
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_auto]"
      >
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as InviteRole)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm transition outline-none focus:border-slate-500 focus:ring-4 focus:ring-slate-100"
          >
            {inviteRoles.map((inviteRole) => (
              <option key={inviteRole} value={inviteRole}>
                {inviteRole.charAt(0).toUpperCase() + inviteRole.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isSaving}
          className="self-end rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Creating..." : "Create invite"}
        </button>
      </form>

      {inviteLink ? (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">
            Invite link
          </p>
          <p className="mt-2 text-sm break-all text-slate-700">{inviteLink}</p>
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Copy link
          </button>
        </div>
      ) : null}

      <div className="mt-5">
        <h4 className="text-sm font-semibold text-slate-950">
          Pending invites
        </h4>
        {pendingInvites.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No pending invites.</p>
        ) : (
          <div className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {pendingInvites.map((invite) => (
              <div
                key={invite.id}
                className="grid gap-2 px-3 py-3 text-sm lg:grid-cols-[1fr_120px_180px_100px]"
              >
                <span className="font-medium text-slate-950">
                  {invite.email}
                </span>
                <span className="text-slate-600">{invite.role}</span>
                <span className="text-slate-500">
                  Expires {formatInviteDate(invite.expiresAt)}
                </span>
                <button
                  type="button"
                  disabled={deletingInviteId === invite.id}
                  onClick={() => void deleteInvite(invite.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingInviteId === invite.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatInviteDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(value);
}

function RoleSelect({
  disabled,
  onChange,
  role,
}: {
  disabled: boolean;
  onChange: (role: TeamRole) => void;
  role: TeamRole;
}) {
  return (
    <select
      value={role}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as TeamRole)}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
    >
      {teamRoles.map((teamRole) => (
        <option key={teamRole} value={teamRole}>
          {teamRole.charAt(0).toUpperCase() + teamRole.slice(1)}
        </option>
      ))}
    </select>
  );
}
