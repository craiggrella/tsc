"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function MfaChallengePage() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: factors, error: listErr } = await supabase.auth.mfa.listFactors();
      if (listErr) throw listErr;
      const verified = (factors?.totp || []).find((f) => f.status === "verified");
      if (!verified) {
        // No verified factor — nothing to challenge against. Just redirect.
        window.location.href = "/dashboard";
        return;
      }
      const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: verified.id,
      });
      if (chErr) throw chErr;
      if (!challenge) throw new Error("Could not start challenge");
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: verified.id,
        challengeId: challenge.id,
        code,
      });
      if (vErr) throw vErr;
      window.location.href = "/dashboard";
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm px-6">
        <div className="mb-10 flex justify-center">
          <img
            src="/images/shuman-logo.svg"
            alt="The Shuman Company"
            width={160}
            height={160}
            className="h-auto w-[160px]"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="code"
              className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
            >
              Authenticator Code
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoFocus
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-base font-mono tracking-[0.4em] text-center text-black placeholder:text-zinc-300 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              placeholder="123456"
            />
            <p className="mt-1.5 text-xs text-zinc-400">
              Enter the 6-digit code from your authenticator app.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button
            type="submit"
            disabled={busy || code.length < 6}
            className="w-full bg-black text-white hover:bg-zinc-800"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>

          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}
