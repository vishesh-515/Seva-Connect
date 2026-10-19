import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentOrg } from "@/lib/org-context";
import { PageHeader } from "@/components/feedback/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Organization profile — Seva Connect" },
      { name: "description", content: "Organization profile, currency and timezone." },
      { property: "og:title", content: "Organization profile — Seva Connect" },
      { property: "og:description", content: "Organization profile and preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const FIELDS: { name: string; label: string; required?: boolean; type?: string }[] = [
  { name: "name", label: "Organization name", required: true },
  { name: "org_type", label: "Organization type", required: true },
  { name: "contact_email", label: "Contact email", required: true, type: "email" },
  { name: "phone", label: "Phone", required: true, type: "tel" },
  { name: "country", label: "Country", required: true },
  { name: "currency", label: "Currency code (e.g. INR)", required: true },
  { name: "timezone", label: "Timezone (e.g. Asia/Kolkata)", required: true },
];

function Page() {
  const { org, can, refresh } = useCurrentOrg();
  const editable = can("settings.manage");
  const [f, setF] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      [...FIELDS.map((x) => x.name), "address"].map((k) => [k, ((org as any)[k] ?? "") as string]),
    ),
  );

  const save = useMutation({
    mutationFn: async () => {
      for (const x of FIELDS)
        if (x.required && !f[x.name]?.trim()) throw new Error(`${x.label} is required`);
      if (!/^[A-Za-z]{3}$/.test((f["currency"] ?? "").trim()))
        throw new Error("Currency must be a 3-letter code");
      try {
        new Intl.DateTimeFormat("en", { timeZone: (f["timezone"] ?? "").trim() });
      } catch {
        throw new Error("Unknown timezone");
      }

      const patch = Object.fromEntries(
        Object.entries(f).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
      );
      patch["currency"] = (f["currency"] ?? "").trim().toUpperCase();

      const { error } = await supabase
        .from("organizations")
        .update(patch as any)
        .eq("id", org!.id);
      if (error) throw error;
      return patch;
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Profile saved");
    },
    onError: (e: any) => toast.error(e?.message ?? "Couldn't save profile"),
  });

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Organization profile"
        description={
          editable
            ? "Changes apply to everyone in your organization."
            : "Only owners and administrators can change this profile."
        }
      />
      <form
        className="grid gap-4 rounded-2xl border border-[#E8DFD5] dark:border-[#35231C] bg-white dark:bg-[#1E1411] p-6 sm:grid-cols-2 shadow-xs"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        {FIELDS.map((x) => (
          <div key={x.name} className="space-y-1.5">
            <Label htmlFor={x.name} className="text-xs font-semibold uppercase tracking-wider text-[#7D6E63] dark:text-[#AFA196]">
              {x.label}
              {x.required && <span className="text-[#D32F2F] dark:text-[#E05345]"> *</span>}
            </Label>
            <Input
              id={x.name}
              type={x.type ?? "text"}
              value={f[x.name] ?? ""}
              disabled={!editable}
              onChange={(e) => setF({ ...f, [x.name]: e.target.value })}
              className="rounded-xl border-[#E2D8CC] dark:border-[#35231C] bg-white dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB] placeholder:text-[#AFA196] focus-visible:border-[#C87A38] dark:focus-visible:border-[#E29555] disabled:opacity-50"
            />
          </div>
        ))}

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="address" className="text-xs font-semibold uppercase tracking-wider text-[#7D6E63] dark:text-[#AFA196]">Address</Label>
          <Textarea
            id="address"
            rows={3}
            value={f["address"] ?? ""}
            disabled={!editable}
            onChange={(e) => setF({ ...f, address: e.target.value })}
            className="rounded-xl border-[#E2D8CC] dark:border-[#35231C] bg-white dark:bg-[#130D0B] text-[#2A1D17] dark:text-[#FFFDFB] placeholder:text-[#AFA196] focus-visible:border-[#C87A38] dark:focus-visible:border-[#E29555] disabled:opacity-50"
          />
        </div>
        {editable && (
          <div className="sm:col-span-2 pt-2">
            <Button type="submit" disabled={save.isPending} className="rounded-full bg-gradient-to-r from-[#D4843D] to-[#B86B28] text-white font-bold shadow-sm hover:brightness-105">
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
