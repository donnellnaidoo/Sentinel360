import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { useSession } from "@/contexts/session-context";
import { hasSeenOnboarding } from "@/lib/onboarding-seen";

export default function Home() {
  const { session, loading } = useSession();
  const [seen, setSeen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    hasSeenOnboarding().then((value) => {
      if (!cancelled) setSeen(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || seen === null) return null;

  if (session?.user) {
    return <Redirect href="/(drawer)/(tabs)" />;
  }

  return <Redirect href={seen ? "/sign-in" : "/onboarding"} />;
}
