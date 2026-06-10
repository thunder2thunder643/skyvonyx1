import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/skyvonyx/Logo";
import { toast } from "sonner";
import { Shield, ShieldCheck, Trash2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({ meta: [{ title: "Security — Skyvonyx" }] }),
  component: SecurityPage,
});

type Factor = { id: string; friendly_name?: string | null; factor_type: string; status: string };

function SecurityPage() {
  const navigate = useNavigate();
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<null | { factorId: string; qr: string; secret: string }>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) toast.error("Could not load factors");
    setFactors([...(data?.totp ?? [])] as Factor[]);
    setLoading(false);
  }
  useEffect(() => { refresh(); }, []);

  async function startEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toISOString().slice(0,10)}`,
      });
      if (error) throw error;
      setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
    } catch (e: any) {
      toast.error(e.message ?? "Could not start enrollment");
    } finally { setBusy(false); }
  }

  async function verifyEnroll() {
    if (!enrolling) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (chErr) throw chErr;
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId, challengeId: ch.id, code,
      });
      if (vErr) throw vErr;
      try { await supabase.from("auth_events").insert({ event_type: "mfa_enrolled" }); } catch {}
      toast.success("MFA enabled");
      setEnrolling(null); setCode("");
      await refresh();
    } catch (e: any) {
      toast.error("Invalid code. Try again.");
    } finally { setBusy(false); }
  }

  async function unenroll(factorId: string) {
    if (!confirm("Disable this authenticator?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return toast.error(error.message);
    try { await supabase.from("auth_events").insert({ event_type: "mfa_unenrolled" }); } catch {}
    toast.success("Removed");
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  const verified = factors.filter(f => f.status === "verified");

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60 backdrop-blur-md bg-background/50 sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3"><Logo className="h-6" /></Link>
          <nav className="flex items-center gap-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Link to="/workspace" className="hover:text-gold flex items-center gap-1.5"><ArrowLeft className="size-3.5" /> Workspace</Link>
            <span className="text-gold">Security</span>
            <button onClick={signOut} className="hover:text-gold">Sign out</button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-10 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Account</p>
          <h1 className="font-display text-3xl text-gold-gradient mt-1">Security Settings</h1>
        </div>

        <section className="glass-panel hud-corners rounded-md p-6">
          <div className="flex items-start gap-4">
            <div className="size-10 rounded-sm bg-secondary/60 flex items-center justify-center text-gold">
              {verified.length ? <ShieldCheck className="size-5" /> : <Shield className="size-5" />}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-lg">Two-Factor Authentication (TOTP)</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Use an authenticator app (1Password, Authy, Google Authenticator) to require a one-time code on every sign-in.
              </p>

              {loading ? (
                <p className="text-xs text-muted-foreground mt-4">Loading…</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {factors.map(f => (
                    <div key={f.id} className="flex items-center justify-between border border-border rounded-sm px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{f.friendly_name || "Authenticator"}</div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{f.status}</div>
                      </div>
                      <button onClick={() => unenroll(f.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  {!enrolling && (
                    <button onClick={startEnroll} disabled={busy}
                      className="bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs px-4 py-2.5 rounded-sm glow-gold-sm disabled:opacity-50">
                      {busy ? "Preparing…" : "Add authenticator"}
                    </button>
                  )}
                </div>
              )}

              {enrolling && (
                <div className="mt-6 border border-border rounded-sm p-4 space-y-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Scan the QR with your authenticator app</p>
                  <img src={enrolling.qr} alt="MFA QR" className="bg-white p-2 rounded-sm w-44 h-44" />
                  <p className="text-[10px] text-muted-foreground break-all">Or enter this secret: <span className="font-mono text-foreground">{enrolling.secret}</span></p>
                  <input
                    value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit code" inputMode="numeric"
                    className="w-full bg-secondary/40 border border-border rounded-sm px-3 py-2.5 text-sm focus:border-gold focus:outline-none tracking-[0.4em] text-center font-mono"
                  />
                  <div className="flex gap-2">
                    <button onClick={verifyEnroll} disabled={busy || code.length !== 6}
                      className="flex-1 bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-xs py-2.5 rounded-sm disabled:opacity-50">
                      Verify & Enable
                    </button>
                    <button onClick={() => { setEnrolling(null); setCode(""); }}
                      className="px-4 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-md p-6">
          <h2 className="font-display text-lg mb-2">Password</h2>
          <p className="text-sm text-muted-foreground mb-4">Send yourself a password reset link to change your password.</p>
          <button
            onClick={async () => {
              const { data } = await supabase.auth.getUser();
              if (!data.user?.email) return;
              await supabase.auth.resetPasswordForEmail(data.user.email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              toast.success("Reset link sent (if account exists).");
            }}
            className="text-xs uppercase tracking-[0.2em] border border-border hover:border-gold hover:text-gold px-4 py-2.5 rounded-sm">
            Send reset link
          </button>
        </section>
      </main>
    </div>
  );
}