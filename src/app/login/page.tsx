"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/send-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));

      // Only a JSON { ok: true } counts as success. A redirect to the login
      // page (HTML, status 200) or any error must not show "check your email".
      if (res.ok && data?.ok === true) {
        setResetSent(true);
      } else {
        setError(data?.error || "Failed to send reset email. Please try again.");
      }
    } catch {
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    const supabase = createClient();
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If user has MFA enrolled, route to the challenge page before /dashboard.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      window.location.href = "/auth/mfa-challenge";
    } else {
      window.location.href = "/dashboard";
    }
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

        {resetSent ? (
          <div className="text-center">
            <p className="text-sm text-zinc-600">
              Check your email for a password reset link.
            </p>
            <button
              onClick={() => setResetSent(false)}
              className="mt-4 text-sm text-zinc-400 hover:text-zinc-600"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="Email address"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-black placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white hover:bg-zinc-800"
            >
              {loading ? "..." : "Sign In"}
            </Button>

            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="block w-full text-center text-xs text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
            >
              Forgot password?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
