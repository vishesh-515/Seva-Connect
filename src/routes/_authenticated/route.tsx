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
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false
  );

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const toggleTheme = () => {
    if (typeof document === "undefined") return;
    const isNowDark = document.documentElement.classList.toggle("dark");
    setIsDark(isNowDark);
    try {
      localStorage.setItem("sevaconnect-theme", isNowDark ? "dark" : "light");
    } catch {}
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-sidebar-border/70 px-4 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-sm shadow-primary/25">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-sidebar-foreground">{org!.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{role && ROLE_LABELS[role]}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => {
            const isActive = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground font-semibold shadow-2xs"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground group-hover:text-sidebar-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                </div>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer info */}
        <div className="border-t border-sidebar-border/70 p-3">
          <div className="rounded-xl border border-sidebar-border/60 bg-card/50 p-2.5 text-xs text-muted-foreground">
            <div className="flex items-center justify-between font-semibold text-foreground">
              <span>Dual-Tone Workspace</span>
              <span className="text-[10px] text-tone-accent font-bold">PRO</span>
            </div>
            <div className="mt-1 text-[11px] truncate">Role: {role && ROLE_LABELS[role]}</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 no-print flex items-center gap-3 border-b border-border/70 bg-card/80 px-4 py-3 backdrop-blur-md">
          <select
            aria-label="Navigate"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium md:hidden"
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
              <SelectTrigger className="w-48 text-xs font-semibold" aria-label="Organization">
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
            onClick={toggleTheme}
            className="rounded-lg hover:bg-muted"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
          </Button>

          <div className="hidden items-center gap-2 rounded-lg border border-border/60 bg-card px-2.5 py-1 text-xs sm:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-medium text-foreground truncate max-w-[140px]">{email}</span>
          </div>

          <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 border-border/80 hover:border-destructive/40 hover:text-destructive">
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sign out</span>
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
