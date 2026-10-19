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
  Moon,
  Sun,
  Barcode,
  FileSpreadsheet,
} from "lucide-react";
import { SevaLogo } from "@/components/brand/SevaLogo";
import { DistributionScanner } from "@/components/scanner/DistributionScanner";
import { supabase } from "@/integrations/supabase/client";
import { OrgProvider, useOrg } from "@/lib/org-context";
import { NotificationBell } from "@/components/NotificationBell";
import { ROLE_LABELS, type Permission } from "@/lib/permissions";
import { humanize } from "@/lib/format";
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
  { to: "/projects", label: "Programmes", icon: FolderKanban },
  { to: "/assistance", label: "Distributions", icon: PackageCheck },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/data-import", label: "Data Import", icon: FileSpreadsheet },
  { to: "/team", label: "Team & Access", icon: UserCog },
  { to: "/settings", label: "Profile", icon: Building2 },
];

function Shell() {
  const { org, role, memberships, setOrgId, can, email } = useOrg();
  const [scannerOpen, setScannerOpen] = useState(false);
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
    <div className="flex min-h-screen bg-[#FAF7F2] dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB]">
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#160E0C] text-[#2A1D17] dark:text-[#FFFDFB] md:flex">
        {/* Brand header */}
        <div className="flex items-center gap-3 border-b border-[#E8DFD5] dark:border-[#2E1E19] px-4 py-4">
          <SevaLogo size={24} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold text-[#2A1D17] dark:text-[#FFFDFB] tracking-tight">{org?.name ?? "Organization"}</div>
            <div className="flex items-center gap-1.5 text-xs text-[#7D6E63] dark:text-[#AFA196]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2EA063]" />
              <span>{role ? ROLE_LABELS[role] ?? humanize(role) : "Member"}</span>
            </div>
          </div>
        </div>

        {/* Quick Launch Station */}
        {can("assistance.write") && (
          <div className="px-3 pt-3">
            <Button
              size="sm"
              onClick={() => setScannerOpen(true)}
              className="w-full gap-2 shadow-2xs font-semibold bg-[#FDF3E7] dark:bg-[#281A15] border border-[#F5D5B8] dark:border-[#48291F] text-[#C87A38] dark:text-[#E29555] hover:bg-[#F8E5D1] dark:hover:bg-[#35211A] transition-all"
            >
              <Barcode className="h-4 w-4 text-[#C87A38] dark:text-[#E29555]" />
              <span>Scan to Distribute</span>
            </Button>
          </div>
        )}

        {/* Sidebar Navigation */}
        <nav className="flex-1 space-y-1 p-3">
          {NAV.filter((n) => !n.perm || can(n.perm)).map((n) => {
            const isActive = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[#FDF3E7] dark:bg-[#281A15] text-[#C87A38] dark:text-[#FFFDFB] font-bold shadow-2xs"
                    : "text-[#7D6E63] dark:text-[#AFA196] hover:bg-[#F5EFE7] dark:hover:bg-[#201410] hover:text-[#2A1D17] dark:hover:text-[#FFFDFB]"
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#C87A38] dark:bg-[#E29555]" />
                )}
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                    isActive
                      ? "bg-[#C87A38] dark:bg-[#E29555] text-white dark:text-[#130D0B]"
                      : "text-[#7D6E63] dark:text-[#AFA196] group-hover:text-[#2A1D17] dark:group-hover:text-[#FFFDFB]"
                  }`}
                >
                  <n.icon className="h-4 w-4" />
                </div>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E8DFD5] dark:border-[#2E1E19]">
          <div className="rounded-xl border border-[#E8DFD5] dark:border-[#35231C] bg-[#FAF7F2] dark:bg-[#1E1411] p-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#2A1D17] dark:text-[#FFFDFB]">NGO Workspace</span>
              <span className="rounded-full bg-[#FDF3E7] dark:bg-[#281A15] border border-[#F5D5B8] dark:border-[#48291F] px-2 py-0.5 text-[10px] font-bold text-[#C87A38] dark:text-[#E29555]">PRO</span>
            </div>
            <p className="mt-1 text-[11px] text-[#7D6E63] dark:text-[#AFA196] capitalize">Role: {role ? (ROLE_LABELS[role] ?? humanize(role)) : "Owner"}</p>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-40 no-print flex items-center gap-3 border-b border-[#E8DFD5] dark:border-[#35231C] bg-white/90 dark:bg-[#160E0C]/90 px-4 py-3 backdrop-blur-md">
          <select
            aria-label="Navigate"
            className="rounded-lg border border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] px-2.5 py-1.5 text-sm font-medium md:hidden text-[#2A1D17] dark:text-[#FFFDFB]"
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

          {can("assistance.write") && (
            <Button
              size="sm"
              onClick={() => setScannerOpen(true)}
              className="md:hidden gap-1.5 h-8 px-2.5 text-xs font-semibold bg-[#FDF3E7] dark:bg-[#281A15] border border-[#F5D5B8] dark:border-[#48291F] text-[#C87A38] dark:text-[#E29555] hover:bg-[#F8E5D1]"
            >
              <Barcode className="h-3.5 w-3.5" />
              <span>Scan</span>
            </Button>
          )}
          
          {memberships.length > 1 && org && (
            <Select value={org.id} onValueChange={setOrgId}>
              <SelectTrigger className="w-48 text-xs font-semibold rounded-xl border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB]" aria-label="Organization">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] text-[#2A1D17] dark:text-[#FFFDFB]">
                {memberships.filter((m) => m?.organization?.id).map((m) => (
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
            className="rounded-full hover:bg-[#FAF7F2] dark:hover:bg-[#251814]"
          >
            {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-[#7D6E63]" />}
          </Button>

          <div className="hidden items-center gap-2 rounded-full border border-[#E8DFD5] dark:border-[#35231C] bg-[#FAF7F2] dark:bg-[#1E1411] px-3 py-1 text-xs sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#2EA063]" />
            <span className="font-medium text-[#2A1D17] dark:text-[#FFFDFB] truncate max-w-[140px]">{email}</span>
          </div>

          <Button variant="outline" size="sm" onClick={signOut} className="gap-1.5 rounded-full border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#221612] text-[#2A1D17] dark:text-[#FFFDFB] hover:bg-[#FAF7F2] dark:hover:bg-[#2C1D18] hover:border-[#C04B3E] hover:text-[#C04B3E]">
            <LogOut className="h-3.5 w-3.5 text-[#C87A38] dark:text-[#E29555]" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8 bg-[#FAF7F2] dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB]">
          <Outlet />
        </main>
      </div>

      {/* Global Distribution Scanner */}
      {org && (
        <DistributionScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          orgId={org.id}
          userRole={role}
        />
      )}
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
