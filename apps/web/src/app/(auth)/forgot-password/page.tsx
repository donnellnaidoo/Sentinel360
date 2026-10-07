"use client";

import Link from "next/link";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // The recovery link signs the user in via the callback, which then
      // sends them on to choose a new password.
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);

    // Rate limiting / misconfiguration is worth surfacing; whether the
    // address exists is not (that would let anyone probe for accounts).
    if (resetError && resetError.status === 429) {
      setError("Too many reset requests. Please wait a few minutes and try again.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-stack-lg pt-12 pb-8 flex flex-col items-center">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-semibold text-center mt-4">Reset Password</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">
          Enter your email and we&apos;ll send you a link to choose a new password.
        </p>
      </div>

      {sent ? (
        <div className="px-stack-lg pb-10 space-y-6">
          <div className="p-3 bg-surface-container-low border border-outline-variant rounded-xl font-body-sm text-body-sm text-on-surface">
            If an account exists for <span className="font-semibold">{email.trim()}</span>, a reset link is on its way.
            Check your inbox (and spam folder).
          </div>
          <Link href="/login" className="block text-center font-body-sm text-body-sm text-primary hover:underline font-medium">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="px-stack-lg pb-10 space-y-6">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-xl font-body-sm text-body-sm">
              {error}
            </div>
          )}

          <div className="relative group">
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=" "
              className="peer w-full h-14 pt-4 pb-1 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
            />
            <label
              htmlFor="email"
              className="peer-label absolute left-4 top-2 text-[11px] text-outline pointer-events-none transition-all duration-200 font-medium peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-primary"
            >
              Email Address
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary-container text-on-primary-container font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container/90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>Send Reset Link</span>
            )}
          </button>

          <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
            Remembered it?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">Back to sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
