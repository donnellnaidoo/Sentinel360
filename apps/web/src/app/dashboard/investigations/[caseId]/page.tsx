"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

import InvestigationDetail from "@/components/command-center/investigation-detail";
import Loader from "@/components/loader";
import { authClient } from "@/lib/auth-client";

export default function InvestigationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const caseId = params.caseId as string;
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

  return <InvestigationDetail agentName={session.user.name} caseId={caseId} />;
}
