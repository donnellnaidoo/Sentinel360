import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        <p className="mt-2 text-sm text-white/60">Enter your email to receive reset instructions</p>
      </div>
      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-white/70">Email</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#3c494e] text-[20px]">mail</span>
            <input type="email" className="w-full rounded-xl border border-[#bbc9cf] bg-[#eff4ff] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#00677e] focus:ring-2 focus:ring-[#00677e]/20" placeholder="Enter your email" />
          </div>
        </div>
        <button className="w-full rounded-xl bg-[#00677e] py-2.5 text-sm font-medium text-white transition-all hover:bg-[#00677e]/90">Send Reset Link</button>
      </div>
      <p className="text-center text-sm text-white/60">
        Remember your password?{" "}
        <Link href="/dashboard" className="text-[#00d4ff] hover:underline">Dashboard</Link>
      </p>
    </div>
  );
}
