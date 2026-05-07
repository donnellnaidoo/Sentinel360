"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import CrimeDocket from "@/components/command-center/crime-docket";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function CrimeDocketPage() {
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

  return <CrimeDocket agentName={session.user.name} />;
}
