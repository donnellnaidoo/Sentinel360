import { useLocalSearchParams } from "expo-router";

import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";

export default function HomeNeighborhoodScreen() {
  const { area } = useLocalSearchParams<{ area?: string }>();
  const areaLabel = typeof area === "string" && area.trim() ? area : "Your current area";

  return (
    <SettingsDetailScreen
      title="Home Neighborhood"
      subtitle="This is the area Sentinel360 uses for nearby alerts and for placing your reports."
      icon="navigate-outline"
    >
      <SettingsInfoCard title="Current area" body={areaLabel} />
      <SettingsInfoCard
        title="5 km alert radius"
        body="Alerts on Home are drawn from about 5 km around this neighborhood. Move to a new area and the radius follows the location on your device."
      />
      <SettingsInfoCard
        title="How it is used"
        body="When you submit a sighting, this neighborhood helps reviewers understand where it happened. It also decides which wanted-person and incident alerts are relevant to you."
      />
      <SettingsInfoCard
        title="If location is off"
        body="Turn on location permission to replace a generic area with your suburb. Without it, nearby alerts cannot be matched to where you are."
      />
    </SettingsDetailScreen>
  );
}
