import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EntityConfig, FieldDef } from "./types";

const NONE = "__none__";

export function buildSchema(fields: FieldDef[], extra?: EntityConfig["validate"]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s = z
      .string()
      .trim()
      .max(f.type === "textarea" ? 4000 : 300, "Too long");
    if (f.type === "email")
      s = s.refine(
        (v) => !v || z.string().email().safeParse(v).success,
        "Enter a valid email",
      ) as any;
    if (f.type === "number")
      s = s.refine(
        (v) => !v || (!isNaN(Number(v)) && Number(v) >= 0),
        "Enter a valid non-negative number",
      ) as any;
    shape[f.name] = s;
  }
  return z.object(shape).superRefine((vals, ctx) => {
    for (const f of fields) {
      const visible = !f.showIf || f.showIf(vals as Record<string, string>);
      if (f.required && visible && !(vals as any)[f.name])
        ctx.addIssue({ code: "custom", path: [f.name], message: `${f.label} is required` });
    }
    const errs = extra?.(vals as Record<string, string>) ?? {};
    for (const [k, m] of Object.entries(errs))
      ctx.addIssue({ code: "custom", path: [k], message: m });
  });
}

export function toPayload(fields: FieldDef[], values: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const visible = !f.showIf || f.showIf(values);
    const v = values[f.name];
    if (!visible || v === "" || v === undefined || v === NONE) out[f.name] = null;
    else if (f.type === "number") out[f.name] = Number(v);
    else out[f.name] = v;
  }
  return out;
}

function RelationSelect({
  field,
  orgId,
  value,
  onChange,
}: {
  field: FieldDef;
  orgId: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const rel = field.relation!;
  const { data } = useQuery({
    queryKey: ["org", orgId, "options", rel.table, rel.filter?.value],
    queryFn: async () => {
      let q = (supabase.from(rel.table as any) as any)
        .select(`id, ${rel.label}`)
        .eq("organization_id", orgId)
        .order(rel.label)
        .limit(500);
      if (rel.filter) q = q.neq(rel.filter.column, rel.filter.value);
      const { data, error } = await q;
      if (error) throw error;
      return data as Record<string, string>[];
    },
  });
  return (
    <Select value={value || NONE} onValueChange={onChange}>
      <SelectTrigger id={field.name}>
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {!field.required && <SelectItem value={NONE}>None</SelectItem>}
        {(data ?? []).map((o) => (
          <SelectItem key={o["id"]} value={o["id"]!}>
            {o[rel.label]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EntityForm({
  config,
  orgId,
  initial,
  submitting,
  onSubmit,
  onCancel,
}: {
  config: EntityConfig;
  orgId: string;
  initial: Record<string, string>;
  submitting: boolean;
  onSubmit: (values: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const form = useForm<Record<string, string>>({
    resolver: zodResolver(buildSchema(config.fields, config.validate)),
    defaultValues: initial,
  });
  const values = form.watch();

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {config.fields.map((f) => {
          if (f.showIf && !f.showIf(values)) return null;
          const err = form.formState.errors[f.name]?.message as string | undefined;
          const v = values[f.name] ?? "";
          return (
            <div key={f.name} className={f.full || f.type === "textarea" ? "sm:col-span-2" : ""}>
              <Label htmlFor={f.name} className="mb-1.5 block">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </Label>
              {f.type === "textarea" ? (
                <Textarea
                  id={f.name}
                  rows={3}
                  placeholder={f.placeholder}
                  {...form.register(f.name)}
                />
              ) : f.type === "select" ? (
                <Select
                  value={v || NONE}
                  onValueChange={(x) =>
                    form.setValue(f.name, x === NONE ? "" : x, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id={f.name}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {!f.required && <SelectItem value={NONE}>None</SelectItem>}
                    {f.options!.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : f.type === "relation" ? (
                <RelationSelect
                  field={f}
                  orgId={orgId}
                  value={v}
                  onChange={(x) =>
                    form.setValue(f.name, x === NONE ? "" : x, { shouldValidate: true })
                  }
                />
              ) : (
                <Input
                  id={f.name}
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "date"
                        ? "date"
                        : f.type === "email"
                          ? "email"
                          : "text"
                  }
                  step={f.type === "number" ? "any" : undefined}
                  placeholder={f.placeholder}
                  aria-invalid={!!err}
                  {...form.register(f.name)}
                />
              )}
              {f.help && !err && <p className="mt-1 text-xs text-muted-foreground">{f.help}</p>}
              {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
