import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { ROLE_LABELS, type OrgRole } from "@/lib/permissions";
import { PageHeader, StatusBadge, ErrorState } from "@/components/feedback/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({
    meta: [
      { title: "Team & Access — Seva Connect" },
      { name: "description", content: "Invite teammates and manage roles in your organization." },
      { property: "og:title", content: "Team & Access — Seva Connect" },
      { property: "og:description", content: "Invite teammates and manage roles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const ROLES = Object.keys(ROLE_LABELS) as OrgRole[];

function Page() {
  const { org, can, role: myRole, userId } = useCurrentOrg();
  const qc = useQueryClient();
  const manage = can("team.manage");
  const roles = myRole === "owner" ? ROLES : ROLES.filter((r) => r !== "owner");
  const members = useQuery({
    queryKey: ["team", org!.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("org_members_directory", { _org: org!.id });
      if (error) throw error;
      return data ?? [];
    },
  });
  const invites = useQuery({
    queryKey: ["invites", org!.id],
    enabled: manage,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invitations")
        .select("*")
        .eq("organization_id", org!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const done = (msg: string) => {
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["team"] });
    qc.invalidateQueries({ queryKey: ["invites"] });
  };
  const fail = (e: any) => toast.error(e?.message ?? "Something went wrong");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("staff");
  const invite = useMutation({
    mutationFn: async () => {
      const e = email.trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(e)) throw new Error("Enter a valid email address");
      const { error } = await supabase.from("invitations").insert({
        organization_id: org!.id,
        email: e,
        role,
        status: "pending",
        invited_by: userId,
      } as any);
      if (error)
        throw error.code === "23505"
          ? new Error("This person already has a pending invitation")
          : error;
    },
    onSuccess: () => {
      setEmail("");
      done("Invitation saved — they'll join automatically when they sign in with that email.");
    },
    onError: fail,
  });
  const updateMember = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, string> }) => {
      const { error } = await supabase
        .from("organization_members")
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => done("Member updated"),
    onError: fail,
  });
  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("invitations")
        .update({ status: "revoked" } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => done("Invitation revoked"),
    onError: fail,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team & Access"
        description="Everyone in your organization and what they can do."
      />
      {manage && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
        >
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-sm font-medium" htmlFor="inv">
              Invite by email
            </label>
            <Input
              id="inv"
              type="email"
              placeholder="name@example.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={invite.isPending}>
            Send invite
          </Button>
        </form>
      )}
      <div className="rounded-lg border bg-card">
        {members.isError ? (
          <ErrorState message="Couldn't load team." onRetry={() => members.refetch()} />
        ) : !members.data ? (
          <Skeleton className="h-40" />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Joined</th>
                {manage && <th className="p-3" />}
              </tr>
            </thead>
            <tbody>
              {members.data.map((m: any) => {
                const editable =
                  manage && m.user_id !== userId && (m.role !== "owner" || myRole === "owner");
                return (
                  <tr key={m.member_id} className="border-t">
                    <td className="p-3">
                      <div className="font-medium">{m.full_name || m.email}</div>
                      <div className="text-xs text-muted-foreground">{m.email}</div>
                    </td>
                    <td className="p-3">
                      {editable ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            updateMember.mutate({ id: m.member_id, patch: { role: v } })
                          }
                        >
                          <SelectTrigger className="h-8 w-44">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r} value={r}>
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        ROLE_LABELS[m.role as OrgRole]
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="p-3">{formatDate(m.joined_at)}</td>
                    {manage && (
                      <td className="p-3 text-right">
                        {editable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              updateMember.mutate({
                                id: m.member_id,
                                patch: { status: m.status === "active" ? "inactive" : "active" },
                              })
                            }
                          >
                            {m.status === "active" ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      {manage && (invites.data?.length ?? 0) > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-sm font-semibold">Pending invitations</h3>
          {invites.data!.map((i: any) => (
            <div
              key={i.id}
              className="flex items-center justify-between border-t py-2 text-sm first:border-0"
            >
              <span>
                {i.email} · {ROLE_LABELS[i.role as OrgRole]} · {formatDate(i.created_at)}
              </span>
              <Button size="sm" variant="ghost" onClick={() => revoke.mutate(i.id)}>
                Revoke
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
