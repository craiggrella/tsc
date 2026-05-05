"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setExchangeError("This reset link is invalid or expired. Request a new one from the sign-in page.");
          setReady(true);
          return;
        }
        // Strip code from URL so refresh doesn't try to re-exchange.
        window.history.replaceState({}, "", "/auth/reset-password");
        setReady(true);
        return;
      }

      // No code — check if there's already a session (link already exchanged).
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setExchangeError("No active reset session. Request a new reset link from the sign-in page.");
      }
      setReady(true);
    }

    init();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 1500);
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

        {!ready ? (
          <p className="text-center text-sm text-zinc-400">Loading...</p>
        ) : exchangeError ? (
          <div className="text-center">
            <p className="text-sm text-red-500">{exchangeError}</p>
            <a
              href="/login"
              className="mt-4 inline-block text-sm text-zinc-400 hover:text-zinc-600"
            >
              Back to sign in
            </a>
          </div>
        ) : done ? (
          <div className="text-center">
            <p className="text-sm text-zinc-600">Password updated. Redirecting...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h1 className="text-center text-sm font-semibold text-black">Set a new password</h1>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
              >
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="Confirm new password"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white hover:bg-zinc-800"
            >
              {loading ? "..." : "Update Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
