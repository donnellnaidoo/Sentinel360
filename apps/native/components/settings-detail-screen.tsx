import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";

export function SettingsDetailScreen({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <View
        style={{
          height: 56,
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="chevron-back" size={22} color={colors.heroAccent} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.text }} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "rgba(14,109,122,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={icon} size={22} color={colors.heroAccent} />
          </View>
          <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color: colors.textMuted, fontWeight: "600" }}>
            {subtitle}
          </Text>
        </View>
        {children}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

export function SettingsInfoCard({ title, body }: { title: string; body: string }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      <Text style={{ fontWeight: "900", color: colors.text, fontSize: 15 }}>{title}</Text>
      <Text style={{ marginTop: 6, color: colors.textMuted, fontWeight: "600", lineHeight: 20 }}>{body}</Text>
    </View>
  );
}

export function SettingsSwitchRow({
  title,
  subtitle,
  value,
  onValueChange,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "900", color: colors.text }}>{title}</Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted, fontWeight: "600", lineHeight: 17 }}>
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#cbd5e1", true: colors.heroAccent }}
        thumbColor="#ffffff"
      />
    </View>
  );
}

export function SettingsGroupCard({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

export function SessionOnlyNote() {
  const { colors } = useAppTheme();
  return (
    <Text style={{ marginTop: 4, fontSize: 12, lineHeight: 18, color: colors.textSubtle, fontWeight: "700" }}>
      These choices stay on this screen for now. They are not saved to your account yet.
    </Text>
  );
}
