import { useSession } from "@/contexts/session-context";
import { Redirect } from "expo-router";

export default function Home() {
  const { session, loading } = useSession();

  if (loading) return null;

  if (!session?.user) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(drawer)/(tabs)" />;
}
