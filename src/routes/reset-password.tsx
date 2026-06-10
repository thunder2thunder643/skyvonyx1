import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/skyvonyx/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password — Skyvonyx" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash and emits a
    // PASSWORD_RECOVERY event; until then we don't allow updates.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    // Fallback: if a session already exists from the recovery link.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Invalidate all other sessions for this user.
      try {
        await supabase.from("auth_events").insert({ event_type: "password_reset_completed" });
        await supabase.auth.signOut({ scope: "others" } as never);
      } catch { /* best effort */ }
      toast.success("Password updated. Please sign in.");
      await supabase.auth.signOut();
      navigate({ to: "/auth", replace: true });
    } catch (err: any) {
      toast.error("Could not update password. The reset link may have expired.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-bg">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,oklch(0.82_0.14_88/0.08),transparent_60%)]" />
      <div className="glass-panel hud-corners rounded-md p-8 w-full max-w-md relative">
        <Link to="/" className="flex justify-center mb-6"><Logo className="h-8" /></Link>
        <h1 className="font-display text-2xl text-center text-gold-gradient mb-1">SET NEW PASSWORD</h1>
        <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
          Recovery Console
        </p>
        {!ready ? (
          <p className="text-center text-sm text-muted-foreground">
            Validating recovery link…
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">New Password</span>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
                className="w-full bg-secondary/40 border border-border rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1.5">Confirm Password</span>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8}
                className="w-full bg-secondary/40 border border-border rounded-sm px-3 py-2.5 text-sm focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold"
              />
            </label>
            <button
              type="submit" disabled={busy}
              className="w-full bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm py-3 rounded-sm glow-gold-sm disabled:opacity-50"
            >
              {busy ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}