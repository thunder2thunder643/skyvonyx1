import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/skyvonyx/Logo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign In — Skyvonyx" }] }),
  component: AuthPage,
});

const LOCK_KEY = "skyvonyx:auth:lock";
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

type LockState = { failures: number; lockedUntil: number };

function readLock(): LockState {
  if (typeof window === "undefined") return { failures: 0, lockedUntil: 0 };
  try { return JSON.parse(localStorage.getItem(LOCK_KEY) || "") as LockState; }
  catch { return { failures: 0, lockedUntil: 0 }; }
}
function writeLock(s: LockState) {
  if (typeof window !== "undefined") localStorage.setItem(LOCK_KEY, JSON.stringify(s));
}
function clearLock() {
  if (typeof window !== "undefined") localStorage.removeItem(LOCK_KEY);
}

async function logAuthEvent(event_type: string, email: string | null, user_id: string | null = null) {
  try {
    await supabase.from("auth_events").insert({
      event_type,
      email,
      user_id,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch { /* best effort */ }
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [lockRemaining, setLockRemaining] = useState(0);
  const [mfa, setMfa] = useState<null | { factorId: string; challengeId: string }>(null);
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      // If MFA is required but session is still AAL1, prompt for code.
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
        await startMfaChallenge();
        return;
      }
      navigate({ to: "/workspace", replace: true });
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, _session) => { check(); });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function startMfaChallenge() {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const totp = factors?.totp?.find(f => f.status === "verified");
    if (!totp) { navigate({ to: "/workspace", replace: true }); return; }
    const { data: ch, error } = await supabase.auth.mfa.challenge({ factorId: totp.id });
    if (error || !ch) { toast.error("Could not start MFA challenge"); return; }
    setMfa({ factorId: totp.id, challengeId: ch.id });
  }

  async function verifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId, challengeId: mfa.challengeId, code: mfaCode,
      });
      if (error) throw error;
      await logAuthEvent("mfa_success", email);
      navigate({ to: "/workspace", replace: true });
    } catch {
      await logAuthEvent("mfa_failed", email);
      toast.error("Invalid code");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    const tick = () => {
      const { lockedUntil } = readLock();
      const remaining = Math.max(0, lockedUntil - Date.now());
      setLockRemaining(remaining);
      if (remaining === 0 && lockedUntil) clearLock();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signin" && lockRemaining > 0) {
      toast.error("Too many attempts. Try again later.");
      return;
    }
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
        // Generic response either way to prevent enumeration.
        if (error && !/already|registered|exists/i.test(error.message)) throw error;
        await logAuthEvent("signup", email);
        toast.success("If this email is available, a verification link has been sent. Check your inbox.");
        setMode("signin");
      } else if (mode === "forgot") {
        await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        await logAuthEvent("password_reset_requested", email);
        toast.success("If an account exists for that email, a reset link has been sent.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const state = readLock();
          const failures = state.failures + 1;
          const lockedUntil = failures >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
          writeLock({ failures, lockedUntil });
          if (lockedUntil) {
            await logAuthEvent("locked", email);
            setLockRemaining(LOCK_MS);
          }
          await logAuthEvent("login_failed", email);
          throw new Error("Invalid credentials");
        }
        clearLock();
        await logAuthEvent("login_success", email);
      }
    } catch (err: any) {
      // Always generic.
      toast.error(err?.message === "Invalid credentials" ? "Invalid credentials" : "Request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const locked = lockRemaining > 0;
  const lockMins = Math.ceil(lockRemaining / 60000);

  if (mfa) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 grid-bg">
        <div className="glass-panel hud-corners rounded-md p-8 w-full max-w-md relative">
          <Link to="/" className="flex justify-center mb-6"><Logo className="h-8" /></Link>
          <h1 className="font-display text-2xl text-center text-gold-gradient mb-1">TWO-FACTOR REQUIRED</h1>
          <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">Enter code from your authenticator</p>
          <form onSubmit={verifyMfa} className="space-y-4">
            <input
              autoFocus value={mfaCode} inputMode="numeric"
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full bg-secondary/40 border border-border rounded-sm px-3 py-3 text-center font-mono tracking-[0.4em] text-lg focus:border-gold focus:outline-none"
            />
            <button type="submit" disabled={busy || mfaCode.length !== 6}
              className="w-full bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm py-3 rounded-sm glow-gold-sm disabled:opacity-50">
              {busy ? "Verifying…" : "Verify"}
            </button>
            <button type="button" onClick={async () => { await supabase.auth.signOut(); setMfa(null); }}
              className="w-full text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold">
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 grid-bg">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,oklch(0.82_0.14_88/0.08),transparent_60%)]" />
      <div className="glass-panel hud-corners rounded-md p-8 w-full max-w-md relative">
        <Link to="/" className="flex justify-center mb-6"><Logo className="h-8" /></Link>
        <h1 className="font-display text-2xl text-center text-gold-gradient mb-1">
          {mode === "signin" ? "ACCESS CONSOLE" : mode === "signup" ? "REQUEST CREDENTIALS" : "RECOVER ACCESS"}
        </h1>
        <p className="text-center text-xs uppercase tracking-[0.25em] text-muted-foreground mb-6">
          Geospatial Intelligence System
        </p>
        {locked && (
          <div className="mb-4 text-center text-xs uppercase tracking-[0.2em] text-destructive">
            Locked — retry in ~{lockMins} min
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <Field label="Operator Name" value={name} onChange={setName} />
          )}
          <Field label="Email" type="email" value={email} onChange={setEmail} required />
          {mode !== "forgot" && (
            <Field label="Password" type="password" value={password} onChange={setPassword} required />
          )}
          <button
            type="submit"
            disabled={busy || locked}
            className="w-full bg-gold-gradient text-primary-foreground font-bold uppercase tracking-[0.2em] text-sm py-3 rounded-sm glow-gold-sm disabled:opacity-50 transition-transform hover:scale-[1.01]"
          >
            {busy ? "Authenticating…" : mode === "signin" ? "Engage" : mode === "signup" ? "Provision" : "Send Reset Link"}
          </button>
        </form>
        <div className="mt-5 flex flex-col gap-2 items-center">
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors"
          >
            {mode === "signin" ? "Need credentials? Sign up" : "Have access? Sign in"}
          </button>
          {mode === "signin" && (
            <button
              onClick={() => setMode("forgot")}
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors"
            >
              Forgot password?
            </button>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => setMode("signin")}
              className="text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold transition-colors"
            >
              Back to sign in
            </button>
          )}
        </div>
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