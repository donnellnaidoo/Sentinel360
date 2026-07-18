"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [popiaConsent, setPopiaConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!popiaConsent) {
      setError("You must accept the privacy policy to create an account");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, popiaConsent }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Registration failed");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300 hover:shadow-lg">
      <div className="px-stack-lg pt-12 pb-8 flex flex-col items-center">
        <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
          <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
        </div>
        <h1 className="font-headline-md text-headline-md text-on-surface font-semibold text-center mt-4">Create Account</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">Register for a Sentinel360 account.</p>
      </div>

      <form onSubmit={handleRegister} className="px-stack-lg pb-10 space-y-6">
        {error && (
          <div className="p-3 bg-error-container text-on-error-container rounded-xl font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <div className="relative group">
          <input
            id="name"
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder=" "
            className="peer w-full h-14 pt-4 pb-1 px-4 bg-surface-container-low border border-outline-variant rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-200"
          />
          <label
            htmlFor="name"
            className="peer-label absolute left-4 top-2 text-[11px] text-outline pointer-events-none transition-all duration-200 font-medium peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[11px] peer-focus:text-primary"
          >
            Full Name
          </label>
        </div>

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
            Password
          </label>
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
          </button>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            id="popiaConsent"
            name="popiaConsent"
            type="checkbox"
            required
            checked={popiaConsent}
            onChange={(e) => setPopiaConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary/20"
          />
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            I consent to Sentinel360 processing my personal information as described in the{" "}
            <Link href="/privacy" target="_blank" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
            , in accordance with the Protection of Personal Information Act (POPIA).
          </span>
        </label>

        <button
          type="submit"
          disabled={loading || !popiaConsent}
          className="w-full h-12 bg-primary-container text-on-primary-container font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container/90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? (
            <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>Create Account</span>
          )}
        </button>
      </form>

      <div className="px-stack-lg py-6 bg-surface-container-low flex justify-center border-t border-outline-variant">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
