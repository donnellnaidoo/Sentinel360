"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import AiAlertsHub from "@/components/command-center/ai-alerts-hub";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function AiAlertsPage() {
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

  return <AiAlertsHub agentName={session.user.name} />;
}
