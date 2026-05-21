import { authClient } from "@/lib/auth-client";
import { Redirect } from "expo-router";

export default function Home() {
  const { data: session } = authClient.useSession();

  // Don't show the drawer landing screen during onboarding/auth.
  if (!session?.user) {
    return <Redirect href="/onboarding" />;
  }

  // Once authenticated, keep the drawer index route but send them to the first tab.
  return <Redirect href="/(drawer)/(tabs)" />;
}
