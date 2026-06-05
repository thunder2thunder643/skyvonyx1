import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/skyvonyx/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Skyvonyx" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/workspace", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/workspace", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/workspace`,
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to verify, then sign in.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-bg">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,oklch(0.82_0.14_88/0.08),transparent_60%)]" />
      <div className="glass-panel hud-corners rounded-md p-8 w-full max-w-md relative">
        <Link to="/" className="flex justify-center mb-6"><Logo className="h-8" /></Link>
        <h1 className="font-display text-2xl text-center text-gold-gradient mb-1">
          {mode === "signin" ? "ACCESS CONSOLE" : "REQUEST CREDENTIALS"}
        </h1>
        <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
          Geospatial Intelligence System
        </p>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Operator Name" value={name} onChange={setName} />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          <Field label="Password" type="password" value={password} onChange={setPassword} required />
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm py-3 rounded-sm glow-gold-sm disabled:opacity-50 transition-transform hover:scale-[1.01]"
          >
            {busy ? "Authenticating…" : mode === "signin" ? "Engage" : "Provision"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="w-full mt-5 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors"
        >
          {mode === "signin" ? "Need credentials? Sign up" : "Have access? Sign in"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-secondary/40 border border-border rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
      />
    </label>
  );
}