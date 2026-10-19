import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="no-print flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500 animate-pulse",
  },
  confirmed: {
    bg: "bg-primary/10 border-primary/30",
    text: "text-primary dark:text-primary-foreground",
    dot: "bg-primary",
  },
  approved: {
    bg: "bg-primary/10 border-primary/30",
    text: "text-primary dark:text-primary-foreground",
    dot: "bg-primary",
  },
  distributed: {
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  completed: {
    bg: "bg-secondary border-border/80",
    text: "text-secondary-foreground",
    dot: "bg-muted-foreground",
  },
  graduated: {
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  accepted: {
    bg: "bg-primary/10 border-primary/30",
    text: "text-primary dark:text-primary-foreground",
    dot: "bg-primary",
  },
  recorded: {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  planned: {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  pending: {
    bg: "bg-amber-500/15 border-amber-500/40",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500 animate-ping",
  },
  on_hold: {
    bg: "bg-amber-500/15 border-amber-500/40",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  inactive: {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  archived: {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  cancelled: {
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  rejected: {
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  refunded: {
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  revoked: {
    bg: "bg-destructive/10 border-destructive/30",
    text: "text-destructive",
    dot: "bg-destructive",
  },
  corrected: {
    bg: "bg-amber-500/15 border-amber-500/40",
    text: "text-amber-800 dark:text-amber-300",
    dot: "bg-amber-500",
  },
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const cfg = statusConfig[status] ?? {
    bg: "bg-muted border-border",
    text: "text-muted-foreground",
    dot: "bg-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        cfg.bg,
        cfg.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {humanize(status)}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 px-6 py-16 text-center backdrop-blur-xs">
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-amber-500/15 text-primary border border-primary/20 shadow-xs">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground leading-normal">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="text-sm font-medium text-destructive">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2 border-destructive/30 hover:bg-destructive/10">
          Try again
        </Button>
      )}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  toneVariant = "primary",
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: string | undefined;
  toneVariant?: "primary" | "amber" | "emerald" | "coral";
}) {
  const toneClasses = {
    primary:
      "from-primary/15 via-primary/5 to-transparent text-primary border-primary/20 hover:border-primary/40",
    amber:
      "from-amber-500/20 via-amber-500/5 to-transparent text-amber-600 dark:text-amber-400 border-amber-500/20 hover:border-amber-500/40",
    emerald:
      "from-emerald-500/20 via-emerald-500/5 to-transparent text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40",
    coral:
      "from-rose-500/20 via-rose-500/5 to-transparent text-rose-600 dark:text-rose-400 border-rose-500/20 hover:border-rose-500/40",
  }[toneVariant];

  const iconBgClasses = {
    primary: "bg-primary/10 text-primary border-primary/20",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    coral: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
  }[toneVariant];

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-5 shadow-xs interactive-card transition-all duration-200",
        toneClasses
      )}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary/10 to-transparent blur-xl transition-transform duration-300 group-hover:scale-150" />
      <div className="relative flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg border shadow-2xs transition-transform duration-200 group-hover:scale-110",
            iconBgClasses
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-3 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
        {value}
      </div>
      {hint && (
        <div className="relative mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-primary/60" />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}

export function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/60 p-3 transition-colors hover:bg-card">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-foreground">{value || "—"}</dd>
    </div>
  );
}

