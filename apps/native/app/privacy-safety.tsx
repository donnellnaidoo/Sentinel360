import { useState } from "react";
import { View } from "react-native";

import {
  SessionOnlyNote,
  SettingsDetailScreen,
  SettingsGroupCard,
  SettingsInfoCard,
  SettingsSwitchRow,
} from "@/components/settings-detail-screen";
import { useAppTheme } from "@/contexts/app-theme-context";

export default function PrivacySafetyScreen() {
  const { colors } = useAppTheme();
  const [showNeighborhood, setShowNeighborhood] = useState(true);
  const [anonymousByDefault, setAnonymousByDefault] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);

  return (
    <SettingsDetailScreen
      title="Privacy & Safety"
      subtitle="Control what other members and reviewers can see about you."
      icon="shield-outline"
    >
      <SettingsInfoCard
        title="Your identity on reports"
        body="Sightings can be sent with your name or as an anonymous community report. Anonymous reports still include the location you provide so responders can act, but your name is withheld from the public feed."
      />
      <SettingsInfoCard
        title="What stays private"
        body="Your phone number, email, and exact GPS point are used to contact you and place alerts. They are not shown on the wanted feed or to other community members."
      />
      <SettingsGroupCard>
        <SettingsSwitchRow
          title="Show my neighborhood"
          subtitle="Let reports display your area name, such as the suburb, instead of a street address."
          value={showNeighborhood}
          onValueChange={setShowNeighborhood}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingsSwitchRow
          title="Anonymous reporting"
          subtitle="Start new sightings as anonymous. You can still turn this off on a single report."
          value={anonymousByDefault}
          onValueChange={setAnonymousByDefault}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingsSwitchRow
          title="Use location for alerts"
          subtitle="Allow Sentinel360 to use your area when deciding which alerts to show."
          value={shareLocation}
          onValueChange={setShareLocation}
        />
      </SettingsGroupCard>
      <SessionOnlyNote />
    </SettingsDetailScreen>
  );
}
