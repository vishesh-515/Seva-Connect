import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type QuickField = {
  name: string;
  label: string;
  type?: "text" | "number" | "date";
  options?: { table: string; label: string; exclude?: string[] };
  required?: boolean;
  initial?: string;
};

function OptionSelect({
  id,
  f,
  value,
  onChange,
}: {
  id: string;
  f: QuickField;
  value: string;
  onChange: (v: string) => void;
}) {
  const { org } = useCurrentOrg();
  const q = useQuery({
    queryKey: ["org", org.id, f.options!.table, "options"],
    queryFn: async () =>
      (
        await (supabase.from(f.options!.table as any) as any)
          .select(`id, ${f.options!.label}`)
          .eq("organization_id", org.id)
          .order(f.options!.label)
          .limit(500)
      ).data ?? [],
  });
  return (
    <select
      id={id}
      required={f.required}
      className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select…</option>
      {(q.data as any[] | undefined)
        ?.filter((o) => !f.options!.exclude?.includes(o.id))
        .map((o) => (
          <option key={o.id} value={o.id}>
            {o[f.options!.label]}
          </option>
        ))}
    </select>
  );
}

/** Small dialog to insert a linked row (assign member, log hours, link beneficiary). */
export function QuickAdd({
  label,
  table,
  fields,
  fixed,
  trigger,
}: {
  label: string;
  table: string;
  fields: QuickField[];
  fixed: Record<string, unknown>;
  trigger?: ReactNode;
}) {
  const { org } = useCurrentOrg();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const init = () => Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ""]));
  const [v, setV] = useState<Record<string, string>>(init);
  const m = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...fixed, organization_id: org.id };
      for (const f of fields)
        payload[f.name] =
          v[f.name] === "" ? null : f.type === "number" ? Number(v[f.name]) : v[f.name];
      const { error } = await (supabase.from(table as any) as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved");
      setOpen(false);
      setV(init());
      qc.invalidateQueries({ queryKey: ["org", org.id] });
    },
    onError: (e: Error) =>
      toast.error(e.message.includes("duplicate") ? "Already linked." : e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="mr-1 h-4 w-4" />
            {label}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          {fields.map((f) => (
            <div key={f.name}>
              <Label htmlFor={`qa-${f.name}`} className="mb-1.5 block">
                {f.label}
                {f.required && " *"}
              </Label>
              {f.options ? (
                <OptionSelect
                  id={`qa-${f.name}`}
                  f={f}
                  value={v[f.name] ?? ""}
                  onChange={(x) => setV({ ...v, [f.name]: x })}
                />
              ) : (
                <Input
                  id={`qa-${f.name}`}
                  type={f.type ?? "text"}
                  step="any"
                  required={f.required}
                  value={v[f.name] ?? ""}
                  onChange={(e) => setV({ ...v, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <Button type="submit" className="w-full" disabled={m.isPending}>
            {m.isPending ? "Saving…" : "Save"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
