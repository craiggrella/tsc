"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [magicSent, setMagicSent] = useState(false);

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
    } else {
      window.location.href = "/dashboard";
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    const supabase = createClient();
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMagicSent(true);
    }
    setLoading(false);
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

        {magicSent ? (
          <div className="text-center">
            <p className="text-sm text-zinc-600">
              Check your email for a login link.
            </p>
            <button
              onClick={() => setMagicSent(false)}
              className="mt-4 text-sm text-zinc-400 hover:text-zinc-600"
            >
              Try again
            </button>
          </div>
        ) : (
          <form
            onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}
            className="space-y-4"
          >
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
                placeholder="you@theshumancompany.com"
              />
            </div>

            {mode === "password" && (
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
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white hover:bg-zinc-800"
            >
              {loading
                ? "..."
                : mode === "password"
                ? "Sign In"
                : "Send Magic Link"}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "password" ? "magic" : "password")}
              className="block w-full text-center text-xs text-zinc-400 hover:text-zinc-600"
            >
              {mode === "password"
                ? "Sign in with magic link instead"
                : "Sign in with password instead"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
