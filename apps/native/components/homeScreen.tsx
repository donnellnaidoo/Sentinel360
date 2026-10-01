import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CommunityMap from "./communityMap";
import { useRouter } from "expo-router";

import { AccountAvatarButton } from "@/lib/account-profile";
import { useAppTheme } from "@/contexts/app-theme-context";
import { regionHeadline, useUserLocation } from "@/contexts/user-location-context";
import { trpc } from "@/utils/trpc";


function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: "flex-start",
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#facc15" }} />
      <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function CommunityItem({
  tag,
  title,
  time,
}: {
  tag: { label: string; bg: string; fg: string };
  title: string;
  time: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 12,
          backgroundColor: "#e2e8f0",
        }}
      />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              backgroundColor: tag.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "900", color: tag.fg }}>{tag.label}</Text>
          </View>
          <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "700" }}>{time}</Text>
        </View>
        <Text style={{ marginTop: 6, color: colors.text, fontWeight: "800" }}>{title}</Text>
        <Text style={{ marginTop: 2, color: colors.textSubtle, fontSize: 12 }}>
          Updates for Auckland Park residents and nearby streets...
        </Text>
      </View>
    </View>
  );
}

function AlertItem({
  accent,
  iconBg,
  icon,
  title,
  subtitle,
  status,
  time,
}: {
  accent: string;
  iconBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  status: string;
  time: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <View style={{ width: 4, alignSelf: "stretch", backgroundColor: accent }} />
      <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={16} color={colors.text} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "900" }}>{title}</Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: colors.textMuted, fontWeight: "600" }}>
            {subtitle}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSubtle }}>{status}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 11, color: colors.textSubtle, fontWeight: "700" }}>{time}</Text>
          <Ionicons name="ellipsis-vertical" size={14} color={colors.iconMuted} />
        </View>
      </View>
    </View>
  );
}

const ALERT_ITEM_STYLE: Record<string, { accent: string; iconBg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CRITICAL: { accent: "#b91c1c", iconBg: "#fee2e2", icon: "alert-circle" },
  HIGH: { accent: "#eab308", iconBg: "#fef3c7", icon: "warning" },
  MEDIUM: { accent: "#3b82f6", iconBg: "#dbeafe", icon: "information-circle" },
  LOW: { accent: "#cbd5e1", iconBg: "#e2e8f0", icon: "information-circle" },
};

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m\nago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h\nago`;
  return `${Math.floor(hr / 24)}d\nago`;
}

export default function HomeScreen() {
  const { data: alerts, isLoading: isLoadingAlerts } = useQuery(trpc.alerts.listMine.queryOptions());
  const recentAlerts = (alerts ?? []).slice(0, 3);
  const router = useRouter();
  const { colors } = useAppTheme();
  const { status: locationStatus, place, message: locationMessage } = useUserLocation();
  const regionLabel = regionHeadline(locationStatus, place);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
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
          accessibilityRole="button"
          accessibilityLabel="Open menu"
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 999, //12
            overflow: "hidden",
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.85 : 1,
            backgroundColor: colors.chip,
          })}
        >
          <Ionicons name="menu" size={22} color={colors.brand} />
        </Pressable>

        <Text style={{ flex: 1, marginLeft: 10, fontSize: 20, fontWeight: "900", color: colors.brand }}>
          Community Safety
        </Text>

        <AccountAvatarButton />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: 10,
            backgroundColor: colors.cta,
            borderRadius: 18,
            padding: 18,
            overflow: "hidden",
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800", letterSpacing: 1 }}>
            CURRENT REGION
          </Text>
          <Text style={{ marginTop: 8, fontSize: regionLabel.length > 18 ? 24 : 30, fontWeight: "900", color: "#fff" }}>
            {regionLabel}
          </Text>
          {locationStatus !== "ready" && locationMessage ? (
            <Text style={{ marginTop: 8, color: "rgba(255,255,255,0.8)", fontWeight: "700" }}>
              {locationMessage}
            </Text>
          ) : null}
          <View style={{ marginTop: 12 }}>
            <Pill label="Status: Safe" />
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            backgroundColor: colors.surface,
            borderRadius: 18,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
            overflow: "hidden",
          }}
        >
          <CommunityMap height={150} />
          <Pressable
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: colors.brand, fontWeight: "800" }}>Nearby Activity</Text>

            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Community Updates</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSubtle }}>
                Verified announcements from {place?.label ?? "your area"}
              </Text>
            </View>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ color: colors.text, fontWeight: "900" }}>
                View{`\n`}all
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14, gap: 12 }}>
            <CommunityItem
              tag={{ label: "CIVIC", bg: "#dbeafe", fg: "#1d4ed8" }}
              title="Kingsway Street Lighting Upgrade"
              time="2h ago"
            />
            <CommunityItem
              tag={{ label: "EVENT", bg: "#fef3c7", fg: "#92400e" }}
              title="Auckland Park Neighbourhood Watch"
              time="5h ago"
            />
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>Recent Alerts</Text>
          <View style={{ marginTop: 12, gap: 12 }}>
            {isLoadingAlerts && <Text style={{ color: colors.textSubtle }}>Loading alerts...</Text>}
            {!isLoadingAlerts && recentAlerts.length === 0 && (
              <Text style={{ color: colors.textSubtle }}>No recent alerts for your area.</Text>
            )}
            {recentAlerts.map((a) => {
              const style = ALERT_ITEM_STYLE[a.severity] ?? ALERT_ITEM_STYLE.MEDIUM;
              return (
                <AlertItem
                  key={a.id}
                  accent={style.accent}
                  iconBg={style.iconBg}
                  icon={style.icon}
                  title={a.title}
                  subtitle={a.alertType.replace(/_/g, " ")}
                  status={a.severity}
                  time={getRelativeTime(new Date(a.createdAt))}
                />
              );
            })}
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => router.push("/(drawer)/(tabs)/report")}
        accessibilityRole="button"
        accessibilityLabel="Panic — report a sighting"
        style={({ pressed }) => ({
          position: "absolute",
          right: 18,
          bottom: 28,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: "#dc2626",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Ionicons name="warning" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

