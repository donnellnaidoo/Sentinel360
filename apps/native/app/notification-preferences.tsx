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

export default function NotificationPreferencesScreen() {
  const { colors } = useAppTheme();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [nearbyAlerts, setNearbyAlerts] = useState(true);
  const [wantedAlerts, setWantedAlerts] = useState(true);
  const [quietHours, setQuietHours] = useState(false);

  return (
    <SettingsDetailScreen
      title="Notification Preferences"
      subtitle="Choose which safety updates Sentinel360 should bring to your attention."
      icon="notifications-outline"
    >
      <SettingsInfoCard
        title="How alerts reach you"
        body="Push notifications cover nearby incidents, wanted-person updates, and replies to reports you submit. Quiet hours pause non-urgent alerts overnight so only critical safety messages come through."
      />
      <SettingsGroupCard>
        <SettingsSwitchRow
          title="Push notifications"
          subtitle="Allow Sentinel360 to send alerts to this device."
          value={pushEnabled}
          onValueChange={setPushEnabled}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingsSwitchRow
          title="Nearby alerts"
          subtitle="Incidents inside your 5 km home neighborhood."
          value={nearbyAlerts}
          onValueChange={setNearbyAlerts}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingsSwitchRow
          title="Wanted person alerts"
          subtitle="Updates when a watched person is reported near you."
          value={wantedAlerts}
          onValueChange={setWantedAlerts}
        />
        <View style={{ height: 1, backgroundColor: colors.border }} />
        <SettingsSwitchRow
          title="Quiet hours"
          subtitle="Mute routine alerts between 22:00 and 06:00."
          value={quietHours}
          onValueChange={setQuietHours}
        />
      </SettingsGroupCard>
      <SessionOnlyNote />
    </SettingsDetailScreen>
  );
}
