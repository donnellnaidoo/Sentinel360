import { Button } from "@Sentinel360/ui/components/button";
import { Input } from "@Sentinel360/ui/components/input";
import { Label } from "@Sentinel360/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { ArrowRight, Eye, EyeOff, Fingerprint, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignInForm() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const featureChips = [
    { Icon: Sparkles, label: "AI Alerts" },
    { Icon: Fingerprint, label: "Secure Vault" },
    { Icon: ShieldCheck, label: "Live Streams" },
  ] as const;

  useEffect(() => {
    if (!isPending && session) {
      router.replace("/dashboard");
    }
  }, [isPending, router, session]);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email.trim(),
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard");
            toast.success("Signed in successfully");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: signInSchema,
    },
  });

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] text-[#191c1d] flex items-center justify-center px-6">
        <div className="rounded-2xl border border-black/5 bg-white/80 px-6 py-5 shadow-[0_24px_80px_-28px_rgba(5,17,37,0.22)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#051125] text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#48617e]">
                Sentinel360
              </p>
              <p className="text-sm text-[#45474d]">Checking your secure session...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (session) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8f9fa] text-[#191c1d]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(84,94,118,0.12),transparent_33%),radial-gradient(circle_at_bottom_left,rgba(27,38,59,0.09),transparent_30%)]" />
      <div className="absolute inset-0 ai-grid-pattern opacity-40" />
      <div className="absolute -right-24 top-16 h-96 w-96 rounded-full bg-[#c2dcff]/30 blur-3xl" />
      <div className="absolute -left-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[#1b263b]/10 blur-3xl" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1280px] items-center px-6 py-10 lg:px-10">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
          <section className="hidden flex-col justify-between gap-10 lg:flex">
            <div className="max-w-xl space-y-8">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#051125] text-white shadow-[0_16px_40px_-20px_rgba(5,17,37,0.6)]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#48617e]">
                    Sentinel360
                  </p>
                  <h1 className="font-headline text-3xl font-extrabold tracking-tight text-[#051125]">
                    Secure Login
                  </h1>
                </div>
              </div>

              <div className="space-y-5">
                <p className="max-w-2xl font-headline text-5xl font-extrabold leading-[1.02] tracking-tight text-[#051125]">
                  Enterprise intelligence, protected by the same precision it delivers.
                </p>
                <p className="max-w-xl text-lg leading-8 text-[#45474d]">
                  Access the command environment through a standard Supabase session with a focused,
                  high-trust entry point built for investigation teams.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {featureChips.map(({ Icon, label }) => (
                  <div
                    className="flex items-center gap-2 rounded-2xl border border-[#c5c6cd] bg-white/80 px-4 py-3 shadow-[0_12px_30px_-22px_rgba(5,17,37,0.35)] backdrop-blur"
                    key={label}
                  >
                    <Icon className="h-4 w-4 text-[#051125]" />
                    <span className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#45474d]">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-[#45474d]">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.12)]" />
              Global System Status: Operational
            </div>
          </section>

          <section className="relative mx-auto w-full max-w-lg rounded-[1.75rem] border border-white/70 bg-[rgba(255,255,255,0.78)] p-6 shadow-[0_30px_120px_-35px_rgba(5,17,37,0.28)] backdrop-blur-2xl sm:p-8 lg:p-10">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#051125] text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#48617e]">
                  Sentinel360
                </p>
                <p className="font-headline text-xl font-extrabold tracking-tight text-[#051125]">
                  Secure Login
                </p>
              </div>
            </div>

            <header className="mb-8 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#48617e]">
                Welcome back
              </p>
              <h2 className="font-headline text-3xl font-extrabold tracking-tight text-[#051125] sm:text-4xl">
                Initialize Session
              </h2>
              <p className="max-w-md text-sm leading-6 text-[#45474d]">
                Enter your credentials to continue into the Sentinel360 command environment.
              </p>
            </header>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                event.stopPropagation();
                form.handleSubmit();
              }}
            >
              <form.Field name="email">
                {(field) => (
                  <div className="space-y-2">
                    <Label
                      className="px-1 text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#45474d]"
                      htmlFor={field.name}
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75777d]" />
                      <Input
                        autoComplete="email"
                        className="h-14 rounded-2xl border border-[#c5c6cd] bg-white/85 pl-11 pr-4 text-[#191c1d] shadow-[0_10px_24px_-20px_rgba(5,17,37,0.25)] transition focus:border-[#051125] focus:ring-0"
                        id={field.name}
                        name={field.name}
                        placeholder="name@enterprise.com"
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p className="text-sm text-red-600" key={error?.message}>
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <Label
                        className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#45474d]"
                        htmlFor={field.name}
                      >
                        Security Key
                      </Label>
                      <button
                        className="text-[0.6875rem] font-bold uppercase tracking-[0.22em] text-[#051125] transition hover:opacity-70"
                        type="button"
                        onClick={() => {
                          toast.info("Password reset flow is not configured yet.");
                        }}
                      >
                        Forgot?
                      </button>
                    </div>

                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#75777d]" />
                      <Input
                        autoComplete="current-password"
                        className="h-14 rounded-2xl border border-[#c5c6cd] bg-white/85 pl-11 pr-12 text-[#191c1d] shadow-[0_10px_24px_-20px_rgba(5,17,37,0.25)] transition focus:border-[#051125] focus:ring-0"
                        id={field.name}
                        name={field.name}
                        placeholder="••••••••••••"
                        type={showPassword ? "text" : "password"}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) => field.handleChange(event.target.value)}
                      />
                      <button
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#75777d] transition hover:text-[#191c1d]"
                        type="button"
                        onClick={() => {
                          setShowPassword((value) => !value);
                        }}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {field.state.meta.errors.map((error) => (
                      <p className="text-sm text-red-600" key={error?.message}>
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </form.Field>

              <label className="flex items-center gap-3 pt-1 text-sm text-[#45474d]">
                <input
                  checked={rememberDevice}
                  className="h-5 w-5 rounded border-[#75777d] text-[#051125] focus:ring-[#051125]/20"
                  type="checkbox"
                  onChange={(event) => {
                    setRememberDevice(event.target.checked);
                  }}
                />
                <span>Remember this terminal</span>
              </label>

              <form.Subscribe
                selector={(state) => ({
                  canSubmit: state.canSubmit,
                  isSubmitting: state.isSubmitting,
                })}
              >
                {({ canSubmit, isSubmitting }) => (
                  <Button
                    className="group mt-1 h-14 w-full rounded-2xl bg-gradient-to-br from-[#051125] to-[#1b263b] text-sm font-bold shadow-[0_20px_40px_-18px_rgba(5,17,37,0.5)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_48px_-20px_rgba(5,17,37,0.55)]"
                    disabled={!canSubmit || isSubmitting}
                    type="submit"
                  >
                    <span>{isSubmitting ? "Initializing..." : "Initialize Session"}</span>
                    {isSubmitting ? (
                      <span className="ml-2 inline-flex h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </form>

            <footer className="mt-8 border-t border-[#e1e3e4] pt-6 text-center">
              <p className="text-sm leading-6 text-[#45474d]">
                Authorized personnel only. Request access via{" "}
                <a className="font-semibold text-[#051125] underline-offset-4 hover:underline" href="#">
                  System Administrator
                </a>
                .
              </p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
