"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, ShieldCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MfaFactor {
  id: string;
  friendly_name?: string | null;
  factor_type: string;
  status: string;
}

/**
 * Inline 2FA management block. Shows current MFA state and the enrollment
 * flow (QR + verify code) when the user clicks Enable.
 */
export function MfaEnroll() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState<MfaFactor | null>(null);
  const [enrolling, setEnrolling] = useState<{
    factorId: string;
    qrSvg: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Load existing factors on mount
  useEffect(() => {
    (async () => {
      const { data, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) {
        // MFA not enabled on the server, or other error
        setError(listErr.message || "Could not load MFA state");
      } else {
        const verified = (data?.totp || []).find((f) => f.status === "verified");
        setFactor(verified || null);
      }
      setLoading(false);
    })();
  }, []);

  async function startEnroll() {
    setBusy(true);
    setError(null);
    try {
      const { data, error: enrollErr } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `TSC ${new Date().toLocaleDateString()}`,
      });
      if (enrollErr) throw enrollErr;
      if (!data) throw new Error("Enroll returned no data");
      setEnrolling({
        factorId: data.id,
        qrSvg: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setCode("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnroll() {
    if (!enrolling) return;
    setBusy(true);
    setError(null);
    try {
      await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
    } catch {
      /* ignore — best effort cleanup */
    }
    setEnrolling(null);
    setCode("");
    setShowSecret(false);
    setBusy(false);
  }

  async function verifyCode() {
    if (!enrolling) return;
    if (code.length < 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: enrolling.factorId,
      });
      if (chErr) throw chErr;
      if (!challenge) throw new Error("Challenge returned no data");
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: enrolling.factorId,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      // Refresh factor state
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const verified = (factors?.totp || []).find((f) => f.status === "verified");
      setFactor(verified || null);
      setEnrolling(null);
      setCode("");
      setShowSecret(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!factor) return;
    if (!confirm("Disable two-factor authentication? Your account will only be protected by your password.")) return;
    setBusy(true);
    setError(null);
    try {
      const { error: unErr } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (unErr) throw unErr;
      setFactor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Checking 2FA status…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {factor ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="font-medium text-black">Two-Factor Authentication: Enabled</span>
          </div>
          <button
            onClick={disable}
            disabled={busy}
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            {busy ? "Disabling…" : "Disable"}
          </button>
        </div>
      ) : enrolling ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Scan this QR code with an authenticator app (Google Authenticator, 1Password, Authy, etc.) and enter the 6-digit code it shows.
          </p>
          <div
            className="inline-block rounded-md border border-zinc-200 bg-white p-2 [&_svg]:h-40 [&_svg]:w-40"
            dangerouslySetInnerHTML={{ __html: enrolling.qrSvg }}
          />
          <div>
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              className="text-xs text-zinc-400 hover:text-black transition-colors"
            >
              {showSecret ? "Hide manual entry code" : "Can't scan? Enter manually"}
            </button>
            {showSecret && (
              <code className="mt-1 block rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 font-mono break-all">
                {enrolling.secret}
              </code>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="w-32 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-mono tracking-[0.3em] outline-none hover:border-zinc-300 focus:border-zinc-400"
            />
            <button
              onClick={verifyCode}
              disabled={busy || code.length < 6}
              className="inline-flex items-center gap-1 rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Verify & Enable
            </button>
            <button
              onClick={cancelEnroll}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-zinc-700">Two-Factor Authentication: <span className="text-zinc-500">Disabled</span></div>
            <p className="mt-0.5 text-xs text-zinc-400">Add a second layer of security with an authenticator app.</p>
          </div>
          <button
            onClick={startEnroll}
            disabled={busy}
            className="rounded-md bg-black px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {busy ? "Starting…" : "Enable"}
          </button>
        </div>
      )}
      {error && !enrolling && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        If you lose access to your authenticator, ask a super-admin to clear your factor in the Supabase auth tables (delete from <code className="font-mono">auth.mfa_factors</code> by user id) so you can re-enroll.
      </p>
    </div>
  );
}
