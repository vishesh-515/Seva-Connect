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
    bg: "bg-[#EBF0E9] border-[#D4E0D2] dark:bg-[#152B1E] dark:border-[#1F4D34]",
    text: "text-[#4F7255] dark:text-[#34D399]",
    dot: "bg-[#4F7255] dark:bg-[#34D399]",
  },
  confirmed: {
    bg: "bg-[#E7EDE2] border-[#D2DEC8] dark:bg-[#152B1E] dark:border-[#1F4D34]",
    text: "text-[#5A7353] dark:text-[#34D399]",
    dot: "bg-[#71866A] dark:bg-[#34D399]",
  },
  approved: {
    bg: "bg-[#E7EDE2] border-[#D2DEC8] dark:bg-[#152B1E] dark:border-[#1F4D34]",
    text: "text-[#5A7353] dark:text-[#34D399]",
    dot: "bg-[#71866A] dark:bg-[#34D399]",
  },
  distributed: {
    bg: "bg-[#EBF0E9] border-[#D4E0D2] dark:bg-[#152B1E] dark:border-[#1F4D34]",
    text: "text-[#4F7255] dark:text-[#34D399]",
    dot: "bg-[#4F7255] dark:bg-[#34D399]",
  },
  completed: {
    bg: "bg-[#EDE4D8] border-[#DCD0C1] dark:bg-[#201511] dark:border-[#35231C]",
    text: "text-[#76695E] dark:text-[#AFA196]",
    dot: "bg-[#96897D] dark:bg-[#827368]",
  },
  graduated: {
    bg: "bg-[#F9F3E8] border-[#EBDCBF] dark:bg-[#281A15] dark:border-[#48291F]",
    text: "text-[#B58B4A] dark:text-[#E29555]",
    dot: "bg-[#B58B4A] dark:bg-[#E29555]",
  },
  accepted: {
    bg: "bg-[#E7EDE2] border-[#D2DEC8] dark:bg-[#152B1E] dark:border-[#1F4D34]",
    text: "text-[#5A7353] dark:text-[#34D399]",
    dot: "bg-[#71866A] dark:bg-[#34D399]",
  },
  recorded: {
    bg: "bg-[#EDE4D8] border-[#DCD0C1] dark:bg-[#201511] dark:border-[#35231C]",
    text: "text-[#76695E] dark:text-[#AFA196]",
    dot: "bg-[#96897D] dark:bg-[#827368]",
  },
  planned: {
    bg: "bg-[#EDE4D8] border-[#DCD0C1] dark:bg-[#201511] dark:border-[#35231C]",
    text: "text-[#76695E] dark:text-[#AFA196]",
    dot: "bg-[#96897D] dark:bg-[#827368]",
  },
  pending: {
    bg: "bg-[#F9F3E8] border-[#EBDCBF] dark:bg-[#281A15] dark:border-[#48291F]",
    text: "text-[#B58B4A] dark:text-[#E29555]",
    dot: "bg-[#B58B4A] dark:bg-[#E29555] animate-pulse",
  },
  on_hold: {
    bg: "bg-[#F9F3E8] border-[#EBDCBF] dark:bg-[#281A15] dark:border-[#48291F]",
    text: "text-[#B58B4A] dark:text-[#E29555]",
    dot: "bg-[#B58B4A] dark:bg-[#E29555]",
  },
  inactive: {
    bg: "bg-[#EDE4D8] border-[#DCD0C1] dark:bg-[#201511] dark:border-[#35231C]",
    text: "text-[#76695E] dark:text-[#827368]",
    dot: "bg-[#96897D] dark:bg-[#827368]",
  },
  archived: {
    bg: "bg-[#EDE4D8] border-[#DCD0C1] dark:bg-[#201511] dark:border-[#35231C]",
    text: "text-[#76695E] dark:text-[#827368]",
    dot: "bg-[#96897D] dark:bg-[#827368]",
  },
  cancelled: {
    bg: "bg-[#F9ECEB] border-[#E8D2CF] dark:bg-[#2E1513] dark:border-[#5A231E]",
    text: "text-[#A7473D] dark:text-[#E05345]",
    dot: "bg-[#A7473D] dark:bg-[#E05345]",
  },
  rejected: {
    bg: "bg-[#F9ECEB] border-[#E8D2CF] dark:bg-[#2E1513] dark:border-[#5A231E]",
    text: "text-[#A7473D] dark:text-[#E05345]",
    dot: "bg-[#A7473D] dark:bg-[#E05345]",
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
      <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#281A15] text-[#E29555] border border-[#48291F] shadow-xs">
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
  toneVariant?: "primary" | "amber" | "emerald" | "coral" | "sage" | "walnut";
}) {
  const iconAccentClasses = {
    primary: "bg-[#EFEBE7] text-[#594438] border-[#DCD0C1] dark:bg-[#281A15] dark:text-[#E29555] dark:border-[#48291F]",
    amber: "bg-[#F7F0E1] text-[#B58B4A] border-[#EBDCBF] dark:bg-[#281A15] dark:text-[#E29555] dark:border-[#48291F]",
    emerald: "bg-[#E6EDE7] text-[#4F7255] border-[#D4E0D2] dark:bg-[#152B1E] dark:text-[#34D399] dark:border-[#1F4D34]",
    sage: "bg-[#E7EDE2] text-[#71866A] border-[#D2DEC8] dark:bg-[#152B1E] dark:text-[#34D399] dark:border-[#1F4D34]",
    coral: "bg-[#F9ECEB] text-[#A7473D] border-[#E8D2CF] dark:bg-[#2E1513] dark:text-[#E05345] dark:border-[#5A231E]",
    walnut: "bg-[#EFEBE7] text-[#594438] border-[#DCD0C1] dark:bg-[#261A15] dark:text-[#E29555] dark:border-[#3D2820]",
  }[toneVariant] || "bg-[#EDE4D8] text-[#594438] border-[#DCD0C1]";

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-[#DCD0C1] bg-[#FFFCF6] p-5 shadow-2xs interactive-card transition-all duration-200 dark:border-[#35231C] dark:bg-[#1E1411]"
      )}
    >
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#76695E] dark:text-[#AFA196]">
          {label}
        </span>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border shadow-2xs transition-transform duration-200 group-hover:scale-105",
            iconAccentClasses
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="relative mt-3 text-2xl font-bold tracking-tight text-[#30241F] md:text-3xl dark:text-[#FFFDFB]">
        {value}
      </div>
      {hint && (
        <div className="relative mt-2 flex items-center justify-between text-xs text-[#76695E] dark:text-[#AFA196]">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C87A38] dark:bg-[#E29555]" />
            <span>{hint}</span>
          </div>
          <span className="text-[11px] font-bold text-[#E29555] opacity-0 transition-opacity group-hover:opacity-100">
            EXPLORE ↗
          </span>
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

