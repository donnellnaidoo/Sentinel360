"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    !token ? "Invalid or missing reset token." : null,
  );
  const [loading, setLoading] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Password reset failed");
        return;
      }

      router.push("/login?reset=success");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl p-8 text-center">
        <h1 className="font-headline-md text-headline-md text-on-surface font-semibold">Invalid Link</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-2">
          This password reset link is invalid or has expired.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block text-primary hover:underline font-medium">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-stack-lg pt-12 pb-8 flex flex-col items-center">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>lock_reset</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-semibold text-center mt-4">Reset Password</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">Enter your new password below.</p>
      </div>

      <form onSubmit={handleReset} className="px-stack-lg pb-10 space-y-6">
        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <div className="relative group">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder=" "
            className="peer w-full h-14 pt-4 pb-1 pl-4 pr-12 bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
          />
          <label
            htmlFor="password"
            className="peer-label absolute left-4 top-2 text-[11px] text-outline pointer-events-none transition-all duration-200 font-medium peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-primary"
          >
            New Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
          </button>
        </div>

        <div className="relative group">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder=" "
            className="peer w-full h-14 pt-4 pb-1 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
          />
          <label
            htmlFor="confirmPassword"
            className="peer-label absolute left-4 top-2 text-[11px] text-outline pointer-events-none transition-all duration-200 font-medium peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-primary"
          >
            Confirm New Password
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
            <span>Reset Password</span>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
