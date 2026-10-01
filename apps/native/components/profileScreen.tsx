import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Image, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";
import { useUserLocation } from "@/contexts/user-location-context";
import { useAccountProfile } from "@/lib/account-profile";
import { supabase } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

function Header() {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.sheetBg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Pressable
        onPress={() => {}}
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="menu" size={22} color={colors.brand} />
      </Pressable>

      <Text style={{ flex: 1, marginLeft: 10, fontSize: 20, fontWeight: "900", color: colors.brand }}>
        Community Safety
      </Text>
    </View>
  );
}

function StatCard({ value, label, onPress }: { value: string; label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: colors.surfaceMuted,
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{value}</Text>
      <Text style={{ marginTop: 4, fontSize: 11, color: colors.textMuted, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function SettingsRow({
  icon,
  iconBg,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingVertical: 14,
        opacity: pressed ? 0.88 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={18} color={colors.text} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "900", color: colors.text }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.iconMuted} />
    </Pressable>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ fontSize: 12, fontWeight: "900", color: colors.textSubtle, letterSpacing: 1 }}>{title}</Text>
      <View
        style={{
          marginTop: 10,
          backgroundColor: colors.surface,
          borderRadius: 16,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 2,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { status: locationStatus, place, message: locationMessage } = useUserLocation();
  const { name: displayName, email: accountEmail, image: avatarUri, initials } = useAccountProfile();
  const email = accountEmail || "demo@sentinel360.com";
  const areaLabel =
    locationStatus === "loading"
      ? "Locating you…"
      : locationStatus === "denied"
        ? "Turn on location to show your area"
        : place
          ? `${place.label} · 5 km alert radius`
          : locationMessage ?? "Location unavailable";

  function goToSignIn() {
    queryClient.clear();
    router.replace("/sign-in");
  }

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Offline or demo session — still sign out locally.
    } finally {
      goToSignIn();
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.cta,
            borderRadius: 18,
            padding: 18,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Pressable
              onPress={() => router.push("/edit-profile")}
              accessibilityRole="button"
              accessibilityLabel="Edit profile picture"
              style={({ pressed }) => ({
                width: 72,
                height: 72,
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.35)",
                backgroundColor: "#0b2e4a",
                alignItems: "center",
                justifyContent: "center",
                opacity: pressed ? 0.9 : 1,
              })}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 72, height: 72 }} />
              ) : (
                <Text style={{ color: "#ffffff", fontSize: 22, fontWeight: "900" }}>{initials}</Text>
              )}
            </Pressable>

            <View style={{ flex: 1 }}>
              <View
                style={{
                  alignSelf: "flex-start",
                  backgroundColor: "rgba(255,255,255,0.18)",
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: "900", color: "#ffffff" }}>VERIFIED MEMBER</Text>
              </View>
              <Text style={{ fontSize: 22, fontWeight: "900", color: "#ffffff" }}>{displayName}</Text>
              <Text style={{ marginTop: 4, color: "rgba(255,255,255,0.78)", fontWeight: "600" }}>{email}</Text>
            </View>
          </View>

          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="location" size={14} color="rgba(255,255,255,0.85)" />
            <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "800", flexShrink: 1 }}>{areaLabel}</Text>
          </View>
        </View>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
          <StatCard value="3" label="Reports" onPress={() => router.push("/my-sightings")} />
          <StatCard value="1" label="Active Tips" onPress={() => router.push("/secure-tips")} />
          <StatCard value="12" label="Alerts" onPress={() => router.push("/(drawer)/(tabs)/alerts")} />
        </View>

        <SettingsGroup title="APPEARANCE">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              paddingVertical: 14,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: isDark ? "#0f766e" : "#dbeafe",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name={isDark ? "moon" : "sunny-outline"} size={18} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: colors.text }}>Dark Mode</Text>
              <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
                {isDark ? "On · Dark appearance" : "Off · Light appearance"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#cbd5e1", true: colors.heroAccent }}
              thumbColor="#ffffff"
            />
          </View>
        </SettingsGroup>

        <SettingsGroup title="ACCOUNT">
          <SettingsRow
            icon="person-outline"
            iconBg="#dbeafe"
            title="Edit Profile"
            subtitle="Name, photo, contact details"
            onPress={() => router.push("/edit-profile")}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingsRow
            icon="notifications-outline"
            iconBg="#fef3c7"
            title="Notification Preferences"
            subtitle="Push, quiet hours, alert types"
            onPress={() => router.push("/notification-preferences")}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingsRow
            icon="lock-closed-outline"
            iconBg="#e0f2fe"
            title="Change Password"
            subtitle="Confirm current password, then set a new one"
            onPress={() => router.push("/change-password")}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingsRow
            icon="shield-outline"
            iconBg="#dcfce7"
            title="Privacy & Safety"
            subtitle="Visibility, anonymous reporting"
            onPress={() => router.push("/privacy-safety")}
          />
        </SettingsGroup>

        <SettingsGroup title="COMMUNITY">
          <SettingsRow
            icon="navigate-outline"
            iconBg="#e0f2fe"
            title="Home Neighborhood"
            subtitle={place?.label ?? "Area used for nearby alerts"}
            onPress={() =>
              router.push({
                pathname: "/home-neighborhood",
                params: { area: areaLabel },
              })
            }
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingsRow
            icon="document-text-outline"
            iconBg="#f1f5f9"
            title="My Sightings"
            subtitle="Track submitted reports and status"
            onPress={() => router.push("/my-sightings")}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingsRow
            icon="chatbox-ellipses-outline"
            iconBg="#ede9fe"
            title="Secure Tips"
            subtitle="Anonymous tip history"
            onPress={() => router.push("/secure-tips")}
          />
        </SettingsGroup>

        <SettingsGroup title="SUPPORT">
          <SettingsRow
            icon="help-circle-outline"
            iconBg="#f1f5f9"
            title="Help Center"
            onPress={() => router.push("/help-center")}
          />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <SettingsRow
            icon="document-outline"
            iconBg="#f1f5f9"
            title="Terms & Privacy"
            onPress={() => router.push("/terms-privacy")}
          />
        </SettingsGroup>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            marginTop: 24,
            backgroundColor: colors.dangerBg,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.dangerText} />
          <Text style={{ fontWeight: "900", color: colors.dangerText }}>Sign Out</Text>
        </Pressable>

        <Text style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: colors.textSubtle, fontWeight: "700" }}>
          Sentinel360 Community · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
