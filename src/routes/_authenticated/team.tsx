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
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] p-5 shadow-xs"
          onSubmit={(e) => {
            e.preventDefault();
            invite.mutate();
          }}
        >
          <div className="min-w-56 flex-1">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#7D6E63] dark:text-[#AFA196]" htmlFor="inv">
              Invite by email
            </label>
            <Input
              id="inv"
              type="email"
              placeholder="name@example.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border-[#E2D8CC] dark:border-[#35231C] bg-white dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB] placeholder:text-[#AFA196] focus-visible:border-[#C87A38] dark:focus-visible:border-[#E29555]"
            />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as OrgRole)}>
            <SelectTrigger className="w-48 rounded-xl border-[#E2D8CC] dark:border-[#35231C] bg-white dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] text-[#2A1D17] dark:text-[#FFFDFB]">
              {roles.map((r) => (
                <SelectItem key={r} value={r} className="hover:bg-[#FAF7F2] dark:hover:bg-[#281A15] hover:text-[#C87A38] dark:hover:text-[#E29555]">
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={invite.isPending} className="rounded-full bg-gradient-to-r from-[#D4843D] to-[#B86B28] text-white font-bold shadow-sm hover:brightness-105">
            Send invite
          </Button>
        </form>
      )}
      <div className="overflow-hidden rounded-2xl border border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] shadow-xs">
        {members.isError ? (
          <ErrorState message="Couldn't load team." onRetry={() => members.refetch()} />
        ) : !members.data ? (
          <Skeleton className="h-40 bg-[#F0E8DC] dark:bg-[#281A15]" />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-[#E8DFD5] dark:border-[#2E1E19] bg-[#FAF7F2] dark:bg-[#160E0C] text-left text-[11px] uppercase font-bold tracking-wider text-[#7D6E63] dark:text-[#AFA196]">
              <tr>
                <th className="p-3.5">Name</th>
                <th className="p-3.5">Role</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Joined</th>
                {manage && <th className="p-3.5" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DE] dark:divide-[#2E1E19]">
              {members.data.map((m: any) => {
                const editable =
                  manage && m.user_id !== userId && (m.role !== "owner" || myRole === "owner");
                return (
                  <tr key={m.member_id} className="hover:bg-[#FAF7F2] dark:hover:bg-[#251914] transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-[#2A1D17] dark:text-[#FFFDFB]">{m.full_name || m.email}</div>
                      <div className="text-xs text-[#7D6E63] dark:text-[#AFA196]">{m.email}</div>
                    </td>
                    <td className="p-3.5 text-[#2A1D17] dark:text-[#FFFDFB]">
                      {editable ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            updateMember.mutate({ id: m.member_id, patch: { role: v } })
                          }
                        >
                          <SelectTrigger className="h-8 w-44 rounded-xl border-[#E2D8CC] dark:border-[#35231C] bg-white dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] text-[#2A1D17] dark:text-[#FFFDFB]">
                            {roles.map((r) => (
                              <SelectItem key={r} value={r} className="hover:bg-[#FAF7F2] dark:hover:bg-[#281A15] hover:text-[#C87A38] dark:hover:text-[#E29555]">
                                {ROLE_LABELS[r]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        ROLE_LABELS[m.role as OrgRole]
                      )}
                    </td>
                    <td className="p-3.5">
                      <StatusBadge status={m.status} />
                    </td>
                    <td className="p-3.5 text-xs text-[#7D6E63] dark:text-[#AFA196]">{formatDate(m.joined_at)}</td>
                    {manage && (
                      <td className="p-3.5 text-right">
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
