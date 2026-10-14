import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

import OnBoarding from "@/components/OnBoarding";
import { useSession } from "@/contexts/session-context";
import { hasSeenOnboarding } from "@/lib/onboarding-seen";

const HERO_BG = "#0b1f22";

export default function OnboardingRoute() {
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

  if (loading || seen === null) {
    return <View style={{ flex: 1, backgroundColor: HERO_BG }} />;
  }

  if (session?.user) {
    return <Redirect href="/(drawer)/(tabs)" />;
  }

  if (seen) {
    return <Redirect href="/sign-in" />;
  }

  return <OnBoarding />;
}
