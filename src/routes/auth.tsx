import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Seva Connect" },
      { name: "description", content: "Sign in to your Seva Connect workspace." },
      { property: "og:title", content: "Sign in — Seva Connect" },
      { property: "og:description", content: "Sign in to your Seva Connect workspace." },
    ],
  }),
  component: Auth,
});

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Check if redirected back with an OAuth error in URL search or hash
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const errorDesc =
        searchParams.get("error_description") || hashParams.get("error_description");
      if (errorDesc) {
        toast.error(decodeURIComponent(errorDesc.replace(/\+/g, " ")));
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
        navigate({ to: "/dashboard", replace: true });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else if (mode === "up") {
        if (password.length < 8) throw new Error("Password must be at least 8 characters");
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/dashboard" },
        });
        if (error) throw error;
        if (data?.session) {
          toast.success("Account created successfully!");
          navigate({ to: "/dashboard" });
          return;
        }
        toast.info("Confirmation email sent. Please check your inbox and Spam folder.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "/reset-password",
        });
        if (error) throw error;
        toast.success("Password reset link sent.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    try {
      setBusy(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) throw error;
    } catch (err) {
      toast.error((err as Error).message || "Google sign-in failed");
      setBusy(false);
    }
  };
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4 dualtone-mesh overflow-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none absolute -top-28 -left-28 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-80 w-80 rounded-full bg-tone-accent/20 blur-3xl" />

      <div className="w-full max-w-md">
        <form
          onSubmit={submit}
          className="relative rounded-2xl border border-border/80 bg-card/90 p-8 shadow-xl backdrop-blur-xl space-y-5"
        >
          {/* Brand & Title */}
          <div className="flex flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/25 mb-3">
              <Leaf className="h-6 w-6" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              Seva <span className="text-primary font-black">Connect</span>
            </span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground">
              {mode === "in" ? "Welcome back" : mode === "up" ? "Create your workspace" : "Reset your password"}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "in"
                ? "Enter your credentials to access your NGO operations"
                : mode === "up"
                  ? "Set up a new humanitarian management organization"
                  : "Enter your email to receive a password reset link"}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          {mode !== "reset" && (
            <div className="grid grid-cols-2 rounded-xl border border-border/70 bg-muted/40 p-1">
              <button
                type="button"
                onClick={() => setMode("in")}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  mode === "in"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("up")}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  mode === "up"
                    ? "bg-card text-foreground shadow-xs border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="director@ngo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-xl bg-background/80"
              />
            </div>
            {mode !== "reset" && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="pw" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </Label>
                  {mode === "in" && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => setMode("reset")}
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <Input
                  id="pw"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded-xl bg-background/80"
                />
              </div>
            )}
          </div>

          <Button type="submit" className="h-11 w-full rounded-xl font-bold shadow-md shadow-primary/20" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "in"
                ? "Sign in to Workspace"
                : mode === "up"
                  ? "Create Organization"
                  : "Send Reset Link"}
          </Button>

          {mode !== "reset" && (
            <>
              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/70" />
                </div>
                <span className="relative bg-card px-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Or authenticate with
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full gap-2 rounded-xl border-border/80 bg-background/50 hover:bg-card"
                onClick={google}
                disabled={busy}
              >
                <GoogleIcon className="h-4 w-4" />
                <span className="text-xs font-bold">Continue with Google</span>
              </Button>
            </>
          )}

          {mode === "reset" && (
            <div className="text-center pt-2">
              <button
                type="button"
                className="text-xs font-bold text-primary hover:underline"
                onClick={() => setMode("in")}
              >
                ← Return to Sign In
              </button>
            </div>
          )}

          {/* Security footnote */}
          <div className="border-t border-border/60 pt-4 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Secured with Supabase RLS & Role-Based Permissions
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
