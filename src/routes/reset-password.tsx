import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Seva Connect" },
      { name: "description", content: "Choose a new password." },
      { property: "og:title", content: "Reset password — Seva Connect" },
      { property: "og:description", content: "Choose a new password." },
    ],
  }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        className="w-full max-w-sm space-y-4 rounded-lg border bg-card p-6"
        onSubmit={async (e) => {
          e.preventDefault();
          if (pw.length < 8) {
            toast.error("Password must be at least 8 characters");
            return;
          }
          const { error } = await supabase.auth.updateUser({ password: pw });
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Password updated");
          navigate({ to: "/dashboard" });
        }}
      >
        <h1 className="text-lg font-semibold">Set a new password</h1>
        <Input
          type="password"
          aria-label="New password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <Button className="w-full" type="submit">
          Update password
        </Button>
      </form>
    </div>
  );
}
