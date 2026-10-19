import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  HandHeart,
  HeartHandshake,
  Coins,
  FolderKanban,
  PackageCheck,
  Receipt,
  BarChart3,
  UserCog,
  Building2,
  LogOut,
  Leaf,
  Moon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { NotificationBell } from "@/components/NotificationBell";
import { ROLE_LABELS, type Permission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    return { user: { id: data.user.id, email: data.user.email ?? "" } };
  },
  component: Layout,
});

function Layout() {
  const { user } = Route.useRouteContext();
  return (
    <OrgProvider userId={user.id} email={user.email}>
      <Gate />
    </OrgProvider>
  );
}

function Gate() {
  const { isLoading, org } = useOrg();
  if (isLoading)
    return (
      <div className="p-8">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (!org) return <Onboarding />;
  return <Shell />;
}

const NAV: { to: string; label: string; icon: typeof Users; perm?: Permission }[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/beneficiaries", label: "Beneficiaries", icon: Users },
  { to: "/volunteers", label: "Volunteers", icon: HandHeart },
  { to: "/donors", label: "Donors", icon: HeartHandshake, perm: "donors.read" },
  { to: "/donations", label: "Donations", icon: Coins },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/assistance", label: "Assistance", icon: PackageCheck },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/team", label: "Team & Access", icon: UserCog },
  { to: "/settings", label: "Profile", icon: Building2 },
];

function Shell() {
  const { org, role, memberships, setOrgId, can, email } = useOrg();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex items-center gap-2 border-b px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{org!.name}</div>
            <div className="text-xs text-muted-foreground">{role && ROLE_LABELS[role]}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-2">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
            <Link
              key={n.to}
              to={n.to as any}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm ${path.startsWith(n.to) ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60"}`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex items-center gap-3 border-b bg-card px-4 py-2.5">
          <select
            aria-label="Navigate"
            className="rounded-md border bg-background px-2 py-1.5 text-sm md:hidden"
            value={path}
            onChange={(e) => navigate({ to: e.target.value as any })}
          >
            {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => (
              <option key={n.to} value={n.to}>
                {n.label}
              </option>
            ))}
          </select>
          <div className="flex-1" />
          {memberships.length > 1 && (
            <Select value={org!.id} onValueChange={setOrgId}>
              <SelectTrigger className="w-48" aria-label="Organization">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {memberships.map((m) => (
                  <SelectItem key={m.organization.id} value={m.organization.id}>
                    {m.organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => {
              const d = document.documentElement.classList.toggle("dark");
              localStorage.setItem("sevaconnect-theme", d ? "dark" : "light");
            }}
          >
            <Moon className="h-4 w-4" />
          </Button>
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign out
          </Button>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Onboarding() {
  const { email, refresh } = useOrg();
  const [f, setF] = useState({
    name: "",
    org_type: "Non-profit",
    contact_email: email,
    phone: "",
    address: "",
    country: "India",
    currency: "INR",
    full_name: "",
  });
  const m = useMutation({
    mutationFn: async () => {
      if (f.name.trim().length < 2) throw new Error("Organization name is required");
      if (!/^[A-Za-z]{3}$/.test(f.currency)) throw new Error("Currency must be a 3-letter code");
      const { error } = await supabase.rpc("create_organization", {
        _name: f.name.trim(),
        _org_type: f.org_type,
        _contact_email: f.contact_email,
        _phone: f.phone || null,
        _address: f.address || null,
        _country: f.country,
        _currency: f.currency.toUpperCase(),
      } as any);
      if (error) throw error;
      const { data } = await supabase.auth.getUser();
      if (f.full_name && data.user)
        await supabase.from("profiles").upsert({ id: data.user.id, full_name: f.full_name });
    },
    onSuccess: async () => {
      toast.success("Welcome to Seva Connect! Your workspace is ready.");
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div>
      <Label htmlFor={k} className="mb-1.5 block">
        {label}
      </Label>
      <Input
        id={k}
        type={type}
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </div>
  );
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <div>
          <h1 className="text-xl font-semibold">Create your NGO workspace</h1>
          <p className="text-sm text-muted-foreground">
            You'll be the owner. You can invite your team later.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("name", "Organization name *")}
          {field("org_type", "Organization type")}
          {field("contact_email", "Contact email *", "email")}
          {field("phone", "Phone")}
          {field("country", "Country")}
          {field("currency", "Currency (e.g. INR)")}
          {field("address", "Address")}
          {field("full_name", "Your full name")}
        </div>
        <Button type="submit" className="w-full" disabled={m.isPending}>
          {m.isPending ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </div>
  );
}
