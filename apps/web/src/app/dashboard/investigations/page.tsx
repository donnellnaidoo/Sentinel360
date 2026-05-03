"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import InvestigationWorkspace from "@/components/command-center/investigation-workspace";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function InvestigationsPage() {
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

  return <InvestigationWorkspace agentName={session.user.name} />;
}
