"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing verification token.");
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          setStatus("success");
          setMessage("Your email has been verified successfully.");
        } else {
          const data = await res.json();
          setStatus("error");
          setMessage(data.message || data.error || "Verification failed.");
        }
      } catch {
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="px-stack-lg pt-12 pb-10 flex flex-col items-center text-center">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
            status === "success"
              ? "bg-success-container shadow-success-container/20"
              : status === "error"
                ? "bg-error-container shadow-error-container/20"
                : "bg-primary shadow-primary/20"
          }`}
        >
          <span
            className="material-symbols-outlined text-white text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {status === "verifying" ? "hourglass_top" : status === "success" ? "verified" : "error"}
          </span>
        </div>

        <h1 className="font-headline-md text-headline-md text-on-surface font-semibold text-center mt-4">
          {status === "verifying"
            ? "Verifying Email"
            : status === "success"
              ? "Email Verified"
              : "Verification Failed"}
        </h1>

        <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-2">{message}</p>

        {status !== "verifying" && status === "success" && (
          <Link href="/login" className="mt-6 text-primary hover:underline font-medium">
            Sign in to your account
          </Link>
        )}
        {status !== "verifying" && status === "error" && (
          <Link href="/login" className="mt-6 text-primary hover:underline font-medium">
            Try registering again
          </Link>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
