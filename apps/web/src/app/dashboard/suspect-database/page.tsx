"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import SuspectDatabase from "@/components/command-center/suspect-database";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function SuspectDatabasePage() {
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

  return <SuspectDatabase agentName={session.user.name} />;
}
