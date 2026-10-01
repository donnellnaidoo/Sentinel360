import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { SettingsDetailScreen } from "@/components/settings-detail-screen";
import { useAppTheme } from "@/contexts/app-theme-context";

const TOPICS = [
  {
    id: "photo",
    question: "How do I change my profile picture?",
    answer:
      "Open Profile, then Edit Profile. Tap the photo, take a new one or choose from your library, and tap Save profile. The picture is stored on your account and shown on your profile card.",
  },
  {
    id: "alerts",
    question: "How do alerts work?",
    answer:
      "The Alerts tab lists safety updates near your home neighborhood. Open Notification Preferences to see which kinds of alerts this app is set up to explain: nearby incidents, wanted-person updates, and quiet hours.",
  },
  {
    id: "report",
    question: "How do I report a sighting?",
    answer:
      "Use the Report tab. Describe what you saw, confirm the location, and attach photos if you have them. You receive a reference code when the report is submitted. My Sightings explains how those reports will be tracked.",
  },
  {
    id: "password",
    question: "How do I change my password?",
    answer:
      "From Profile, open Change Password. Confirm the password you use now, then choose a new one. If you are signed out, use Forgot password on the sign-in screen.",
  },
  {
    id: "privacy",
    question: "Who can see my details?",
    answer:
      "Your email and phone are for your account. Other community members do not see them on the wanted feed. Privacy & Safety explains neighborhood visibility, anonymous reporting, and location used for alerts.",
  },
];

export default function HelpCenterScreen() {
  const { colors } = useAppTheme();
  const [openId, setOpenId] = useState<string | null>("photo");

  return (
    <SettingsDetailScreen
      title="Help Center"
      subtitle="Answers for the profile, alerts, reports, and account screens."
      icon="help-circle-outline"
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
        }}
      >
        {TOPICS.map((topic, index) => {
          const open = openId === topic.id;
          return (
            <View key={topic.id}>
              {index > 0 ? <View style={{ height: 1, backgroundColor: colors.border }} /> : null}
              <Pressable
                onPress={() => setOpenId(open ? null : topic.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 14 }}
              >
                <Text style={{ fontWeight: "900", color: colors.text }}>{topic.question}</Text>
                {open ? (
                  <Text style={{ marginTop: 8, color: colors.textMuted, fontWeight: "600", lineHeight: 20 }}>
                    {topic.answer}
                  </Text>
                ) : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </SettingsDetailScreen>
  );
}
