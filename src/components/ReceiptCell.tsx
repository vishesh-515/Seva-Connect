import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip, Upload, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/lib/org-context";
import { Button } from "@/components/ui/button";

const MAX = 10 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function ReceiptCell({ row }: { row: Record<string, any> }) {
  const { org, can } = useOrg();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const path: string | null = row["receipt_path"];

  const view = async () => {
    const w = window.open("", "_blank");
    const { data, error } = await supabase.storage
      .from("org-documents")
      .createSignedUrl(path!, 120);
    if (error || !data) {
      w?.close();
      toast.error("Couldn't open the receipt");
      return;
    }
    if (w) w.location.href = data.signedUrl;
  };

  const upload = async (file: File) => {
    if (!TYPES.includes(file.type)) {
      toast.error("Upload a PDF, JPG, PNG or WebP file");
      return;
    }
    if (file.size > MAX) {
      toast.error("File must be under 10 MB");
      return;
    }
    setBusy(true);
    try {
      const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_");
      const p = `${org!.id}/expenses/${row["id"]}/${Date.now()}-${safe}`;
      const up = await supabase.storage
        .from("org-documents")
        .upload(p, file, { contentType: file.type });
      if (up.error) throw up.error;
      const { error } = await supabase
        .from("expenses")
        .update({ receipt_path: p })
        .eq("id", row["id"]);
      if (error) throw error;
      toast.success("Receipt attached");
      await qc.invalidateQueries();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {path && (
        <Button variant="ghost" size="sm" onClick={view}>
          <Paperclip className="mr-1 h-3.5 w-3.5" />
          View
        </Button>
      )}
      {can("expenses.write") && (
        <>
          <input
            ref={input}
            type="file"
            hidden
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => input.current?.click()}
            aria-label={path ? "Replace receipt" : "Attach receipt"}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {!path && <span className="ml-1">Attach</span>}
          </Button>
        </>
      )}
      {!path && !can("expenses.write") && <span className="text-muted-foreground">—</span>}
    </div>
  );
}
