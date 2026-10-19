import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { OrgRole, Permission } from "./permissions";
import { can as canRole } from "./permissions";
import { setGlobalDateFormat } from "./format";

export type Organization = Tables<"organizations">;
type Membership = { role: OrgRole; organization: Organization };

type OrgCtx = {
  userId: string;
  email: string;
  memberships: Membership[];
  org: Organization | null;
  role: OrgRole | null;
  setOrgId: (id: string) => void;
  can: (p: Permission) => boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<OrgCtx | null>(null);
const KEY = "sevaconnect-org";

export function OrgProvider({
  userId,
  email,
  children,
}: {
  userId: string;
  email: string;
  children: ReactNode;
}) {
  const qc = useQueryClient();
  const [orgId, setOrgIdState] = useState<string | null>(null);

  useEffect(() => {
    setOrgIdState(localStorage.getItem(KEY) || localStorage.getItem("sevaflow-org"));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["memberships", userId],
    queryFn: async () => {
      await supabase.rpc("accept_pending_invitations");
      const { data, error } = await supabase
        .from("organization_members")
        .select("role, organization:organizations(*)")
        .eq("user_id", userId)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).filter((m) => m.organization) as unknown as Membership[];
    },
  });

  const value = useMemo<OrgCtx>(() => {
    const memberships = data ?? [];
    const current = memberships.find((m) => m.organization.id === orgId) ?? memberships[0] ?? null;
    if (current?.organization?.date_format) {
      setGlobalDateFormat(current.organization.date_format);
    }
    return {
      userId,
      email,
      memberships,
      org: current?.organization ?? null,
      role: current?.role ?? null,
      setOrgId: (id) => {
        localStorage.setItem(KEY, id);
        setOrgIdState(id);
        qc.removeQueries({ predicate: (q) => q.queryKey[0] === "org" });
      },
      can: (p) => canRole(current?.role, p),
      isLoading,
      refresh: async () => {
        await qc.invalidateQueries({ queryKey: ["memberships", userId] });
      },
    };
  }, [data, orgId, userId, email, isLoading, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrg() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOrg must be used inside OrgProvider");
  return v;
}

/** Use inside the app shell where an organization is guaranteed. */
export function useCurrentOrg() {
  const v = useOrg();
  if (!v.org) throw new Error("No organization selected");
  return { ...v, org: v.org };
}
