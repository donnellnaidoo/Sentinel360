"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import LiveSurveillanceMonitor from "@/components/command-center/live-surveillance-monitor";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function LiveSurveillancePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [isPending, router, session]);

  if (isPending) {
    return <Loader />;
  }

  if (!session) {
    return null;
  }

  return <LiveSurveillanceMonitor agentName={session.user.name} />;
}
