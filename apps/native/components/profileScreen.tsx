import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemeToggle } from "@/components/theme-toggle";
import { useSession } from "@/contexts/session-context";
import { supabase } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";
const CTA_BG = "#0b2e4a";

function Header() {
  return (
    <View
      style={{
        height: 56,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: SHEET_BG,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(15, 23, 42, 0.06)",
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
        <Ionicons name="menu" size={22} color={BRAND_BLUE} />
      </Pressable>

      <Text style={{ flex: 1, marginLeft: 10, fontSize: 20, fontWeight: "900", color: BRAND_BLUE }}>
        Community Safety
      </Text>

      <ThemeToggle />
    </View>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f8fafc",
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 10,
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.06)",
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: "900", color: "#0f172a" }}>{value}</Text>
      <Text style={{ marginTop: 4, fontSize: 11, color: "#64748b", fontWeight: "700" }}>{label}</Text>
    </View>
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
        <Ionicons name={icon} size={18} color="#0f172a" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "900", color: "#0f172a" }}>{title}</Text>
        {!!subtitle && (
          <Text style={{ marginTop: 2, fontSize: 12, color: "#64748b", fontWeight: "600" }}>{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
    </Pressable>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Text style={{ fontSize: 12, fontWeight: "900", color: "#94a3b8", letterSpacing: 1 }}>{title}</Text>
      <View
        style={{
          marginTop: 10,
          backgroundColor: "#ffffff",
          borderRadius: 16,
          paddingHorizontal: 14,
          borderWidth: 1,
          borderColor: "rgba(15, 23, 42, 0.06)",
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
  const { session } = useSession();
  const user = session?.user;

  const displayName =
    (typeof user?.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    user?.email?.split("@")[0] ||
    "Community Member";
  const email = user?.email || "demo@sentinel360.com";
  const avatarUri =
    (typeof user?.user_metadata?.avatar_url === "string" && user.user_metadata.avatar_url) ||
    (typeof user?.user_metadata?.image === "string" && user.user_metadata.image) ||
    "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=256&h=256&q=60";

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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: CTA_BG,
            borderRadius: 18,
            padding: 18,
            overflow: "hidden",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 999,
                overflow: "hidden",
                borderWidth: 3,
                borderColor: "rgba(255,255,255,0.35)",
                backgroundColor: "#e2e8f0",
              }}
            >
              <Image source={{ uri: avatarUri }} style={{ width: 72, height: 72 }} />
            </View>

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
            <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "800" }}>Auckland Park · 5 km alert radius</Text>
          </View>
        </View>

        <View style={{ marginTop: 16, flexDirection: "row", gap: 10 }}>
          <StatCard value="3" label="Reports" />
          <StatCard value="1" label="Active Tips" />
          <StatCard value="12" label="Alerts" />
        </View>

        <SettingsGroup title="ACCOUNT">
          <SettingsRow
            icon="person-outline"
            iconBg="#dbeafe"
            title="Edit Profile"
            subtitle="Name, photo, contact details"
          />
          <View style={{ height: 1, backgroundColor: "rgba(15, 23, 42, 0.06)" }} />
          <SettingsRow
            icon="notifications-outline"
            iconBg="#fef3c7"
            title="Notification Preferences"
            subtitle="Push, quiet hours, alert types"
          />
          <View style={{ height: 1, backgroundColor: "rgba(15, 23, 42, 0.06)" }} />
          <SettingsRow
            icon="shield-outline"
            iconBg="#dcfce7"
            title="Privacy & Safety"
            subtitle="Visibility, anonymous reporting"
          />
        </SettingsGroup>

        <SettingsGroup title="COMMUNITY">
          <SettingsRow
            icon="navigate-outline"
            iconBg="#e0f2fe"
            title="Home Neighborhood"
            subtitle="Auckland Park, Johannesburg"
          />
          <View style={{ height: 1, backgroundColor: "rgba(15, 23, 42, 0.06)" }} />
          <SettingsRow
            icon="document-text-outline"
            iconBg="#f1f5f9"
            title="My Sightings"
            subtitle="Track submitted reports and status"
          />
          <View style={{ height: 1, backgroundColor: "rgba(15, 23, 42, 0.06)" }} />
          <SettingsRow icon="chatbox-ellipses-outline" iconBg="#ede9fe" title="Secure Tips" subtitle="Anonymous tip history" />
        </SettingsGroup>

        <SettingsGroup title="SUPPORT">
          <SettingsRow icon="help-circle-outline" iconBg="#f1f5f9" title="Help Center" />
          <View style={{ height: 1, backgroundColor: "rgba(15, 23, 42, 0.06)" }} />
          <SettingsRow icon="document-outline" iconBg="#f1f5f9" title="Terms & Privacy" />
        </SettingsGroup>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => ({
            marginTop: 24,
            backgroundColor: "#fee2e2",
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <Ionicons name="log-out-outline" size={18} color="#991b1b" />
          <Text style={{ fontWeight: "900", color: "#991b1b" }}>Sign Out</Text>
        </Pressable>

        <Text style={{ marginTop: 14, textAlign: "center", fontSize: 11, color: "#94a3b8", fontWeight: "700" }}>
          Sentinel360 Community · v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
