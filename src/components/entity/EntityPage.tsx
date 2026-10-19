import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Download,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Archive,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { useDebounce } from "@/hooks/use-debounce";
import { downloadCsv, toCsv } from "@/lib/format";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState, PageHeader } from "@/components/feedback/common";
import { EntityForm, toPayload } from "./EntityForm";
import type { EntityConfig, Row } from "./types";

const PAGE_SIZE = 20;
const ALL = "__all__";

function friendlyError(e: unknown) {
  const m = (e as { message?: string })?.message ?? "Something went wrong";
  if (m.includes("row-level security")) return "You don't have permission to do that.";
  if (m.includes("violates check constraint"))
    return "Some values are invalid. Please review the form.";
  return m;
}

export function useEntityMutations(config: EntityConfig) {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["org", org.id] });
  const save = useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Record<string, string> }) => {
      const payload = toPayload(config.fields, values);
      const t = supabase.from(config.table as any) as any;
      const { error } = id
        ? await t.update(payload).eq("id", id).eq("organization_id", org.id)
        : await t.insert({ ...payload, organization_id: org.id });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? `${config.singular} updated` : `${config.singular} created`);
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  const remove = useMutation({
    mutationFn: async ({ row, mode }: { row: Row; mode: "archive" | "delete" }) => {
      const t = supabase.from(config.table as any) as any;
      const { error } =
        mode === "archive"
          ? await t
              .update({ status: config.archiveStatus })
              .eq("id", row["id"])
              .eq("organization_id", org.id)
          : await t.delete().eq("id", row["id"]).eq("organization_id", org.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(
        v.mode === "archive" ? `${config.singular} archived` : `${config.singular} deleted`,
      );
      invalidate();
    },
    onError: (e) => toast.error(friendlyError(e)),
  });
  return { save, remove };
}

export function rowToValues(
  config: EntityConfig,
  row: Row | null,
  defaults: Record<string, string>,
) {
  const v: Record<string, string> = {};
  for (const f of config.fields) {
    const raw = row ? row[f.name] : defaults[f.name];
    v[f.name] = raw === null || raw === undefined ? "" : String(raw);
  }
  return v;
}

export function EntityFormDialog({
  config,
  open,
  onOpenChange,
  row,
  presets,
}: {
  config: EntityConfig;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  row: Row | null;
  presets?: Record<string, string>;
}) {
  const { org } = useCurrentOrg();
  const { save } = useEntityMutations(config);
  const [pending, setPending] = useState<{
    values: Record<string, string>;
    message: string;
  } | null>(null);

  const doSave = (values: Record<string, string>) =>
    save.mutate(
      { id: row?.["id"], values },
      {
        onSuccess: () => {
          setPending(null);
          onOpenChange(false);
        },
      },
    );

  const submit = async (values: Record<string, string>) => {
    if (!row) {
      const warn = config.beforeCreate ? await config.beforeCreate(values, org.id) : null;
      const confirm = config.confirmCreate?.(values);
      if (warn || confirm)
        return setPending({ values, message: [warn, confirm].filter(Boolean).join("\n\n") });
    }
    doSave(values);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {row
                ? `Edit ${config.singular.toLowerCase()}`
                : `New ${config.singular.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              Fields marked * are required. Changes are recorded in the activity log.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <EntityForm
              config={config}
              orgId={org.id}
              initial={rowToValues(config, row, {
                ...(config.defaults?.(org) ?? {}),
                ...(presets ?? {}),
              })}
              submitting={save.isPending}
              onSubmit={submit}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Please confirm</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {pending?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction onClick={() => pending && doSave(pending.values)}>
              Confirm and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function applyFilters(
  q: any,
  config: EntityConfig,
  orgId: string,
  search: string,
  filters: Record<string, string>,
  from: string,
  to: string,
) {
  q = q.eq("organization_id", orgId);
  const s = search.trim().replace(/[%,()*]/g, "");
  if (s) q = q.or(config.searchColumns.map((c) => `${c}.ilike.%${s}%`).join(","));
  for (const [k, v] of Object.entries(filters)) if (v && v !== ALL) q = q.eq(k, v);
  if (config.dateFilter && from) q = q.gte(config.dateFilter, from);
  if (config.dateFilter && to) q = q.lte(config.dateFilter, to);
  return q;
}

export function EntityPage({
  config,
  extraActions,
}: {
  config: EntityConfig;
  extraActions?: React.ReactNode;
}) {
  const { org, can } = useCurrentOrg();
  const canWrite = can(config.writePermission);
  const canDelete = can("records.delete");
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState(config.defaultSort);
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<Row | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ row: Row; mode: "archive" | "delete" } | null>(null);
  const { remove } = useEntityMutations(config);

  const query = useQuery({
    queryKey: ["org", org.id, config.table, "list", debounced, filters, from, to, sort, page],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      let q = (supabase.from(config.table as any) as any).select(config.select, { count: "exact" });
      q = applyFilters(q, config, org.id, debounced, filters, from, to);
      q = q
        .order(sort.column, { ascending: sort.ascending })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      const { data, error, count } = await q;
      if (error) throw error;
      return { rows: (data ?? []) as Row[], count: count ?? 0 };
    },
  });

  const exportCsv = async () => {
    let q = (supabase.from(config.table as any) as any).select(config.select);
    q = applyFilters(q, config, org.id, debounced, filters, from, to)
      .order(sort.column, { ascending: sort.ascending })
      .limit(5000);
    const { data, error } = await q;
    if (error) {
      toast.error(friendlyError(error));
      return;
    }
    const rows = (data as Row[]).map((r) => (config.csvMap ? config.csvMap(r) : r));
    downloadCsv(
      `${config.key}-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(rows, config.csv),
    );
    toast.success(`Exported ${rows.length} records`);
  };

  const total = query.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters =
    !!debounced || Object.values(filters).some((v) => v && v !== ALL) || !!from || !!to;

  const toggleSort = (column: string) => {
    setPage(0);
    setSort((s) =>
      s.column === column ? { column, ascending: !s.ascending } : { column, ascending: true },
    );
  };

  return (
    <div>
      <PageHeader
        title={config.title}
        description={config.description}
        actions={
          <>
            {extraActions}
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            {canWrite && (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="mr-1.5 h-4 w-4" /> New {config.singular.toLowerCase()}
              </Button>
            )}
          </>
        }
      />

      <div className="rounded-lg border bg-card shadow-xs">
        <div className="flex flex-col gap-2 border-b p-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              aria-label={`Search ${config.title.toLowerCase()}`}
              placeholder="Search…"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {config.filters?.map((f) => (
              <Select
                key={f.name}
                value={filters[f.name] ?? ALL}
                onValueChange={(v) => {
                  setFilters((s) => ({ ...s, [f.name]: v }));
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-[150px]" aria-label={f.label}>
                  <SelectValue placeholder={f.label} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All {f.label.toLowerCase()}</SelectItem>
                  {f.options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ))}
            {config.dateFilter && (
              <>
                <Input
                  type="date"
                  aria-label="From date"
                  className="w-[150px]"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(0);
                  }}
                />
                <Input
                  type="date"
                  aria-label="To date"
                  className="w-[150px]"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(0);
                  }}
                />
              </>
            )}
          </div>
        </div>

        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <ErrorState message={friendlyError(query.error)} onRetry={() => query.refetch()} />
        ) : query.data!.rows.length === 0 ? (
          <EmptyState
            icon={config.icon}
            title={hasFilters ? "No matching records" : `No ${config.title.toLowerCase()} yet`}
            description={
              hasFilters
                ? "Try adjusting your search or filters."
                : `Records you add will appear here.`
            }
            action={
              !hasFilters && canWrite ? (
                <Button
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add the first one
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  {config.columns.map((c) => (
                    <th
                      key={c.key}
                      className={`whitespace-nowrap px-4 py-2.5 font-medium ${c.className ?? ""}`}
                    >
                      {c.sortable ? (
                        <button
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          onClick={() => toggleSort(c.key)}
                        >
                          {c.label}
                          {sort.column === c.key &&
                            (sort.ascending ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
                        </button>
                      ) : (
                        c.label
                      )}
                    </th>
                  ))}
                  <th className="w-10 px-2" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {query.data!.rows.map((row) => (
                  <tr key={row["id"]} className="border-b last:border-0 hover:bg-muted/40">
                    {config.columns.map((c, i) => (
                      <td key={c.key} className={`px-4 py-3 align-middle ${c.className ?? ""}`}>
                        {i === 0 && config.detailPath ? (
                          <Link
                            to={config.detailPath(row) as any}
                            className="font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {c.render ? c.render(row, org) : (row[c.key] ?? "—")}
                          </Link>
                        ) : c.render ? (
                          c.render(row, org)
                        ) : (
                          (row[c.key] ?? "—")
                        )}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      {(canWrite || config.rowActions) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Row actions">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {config.rowActions?.(row, org)}
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditing(row);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {canWrite &&
                              config.archiveStatus &&
                              row["status"] !== config.archiveStatus && (
                                <DropdownMenuItem
                                  onClick={() => setConfirm({ row, mode: "archive" })}
                                >
                                  <Archive className="mr-2 h-4 w-4" />{" "}
                                  {config.archiveStatus === "archived"
                                    ? "Archive"
                                    : "Cancel record"}
                                </DropdownMenuItem>
                              )}
                            {canDelete && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setConfirm({ row, mode: "delete" })}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>
            {total} record{total === 1 ? "" : "s"}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <EntityFormDialog config={config} open={formOpen} onOpenChange={setFormOpen} row={editing} />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.mode === "delete" ? "Delete permanently?" : "Archive this record?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.mode === "delete"
                ? "This removes the record. Linked history may block deletion — archiving is usually safer."
                : "The record stays in history but is marked inactive. You can change its status later."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirm && remove.mutate(confirm)}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
