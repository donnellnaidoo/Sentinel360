import { useRouter } from "expo-router";

import { AuthCta } from "@/components/auth-flow-ui";
import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";

export default function MySightingsScreen() {
  const router = useRouter();

  return (
    <SettingsDetailScreen
      title="My Sightings"
      subtitle="Reports you send from the Report tab will be listed here with their status."
      icon="document-text-outline"
    >
      <SettingsInfoCard
        title="What a sighting is"
        body="A sighting is a community report of something you saw: a person, vehicle, or incident. Add a description, a location, and photos so reviewers can follow up."
      />
      <SettingsInfoCard
        title="Status you will see"
        body="Submitted reports start as pending review. Reviewers can mark them reviewed or link them to an investigation. This screen will show that history once it is connected to your account."
      />
      <SettingsInfoCard
        title="Nothing here yet"
        body="You do not have saved sightings on this screen. Use Report to send one. Your reference code is shown right after you submit."
      />
      <AuthCta label="Go to Report" onPress={() => router.push("/(drawer)/(tabs)/report")} />
    </SettingsDetailScreen>
  );
}
