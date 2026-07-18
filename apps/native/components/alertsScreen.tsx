import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { queryClient, trpc } from "@/utils/trpc";

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

      <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, fontWeight: "900", color: BRAND_BLUE }}>
        COMMUNITY SAFETY
      </Text>

      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#e2e8f0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=128&h=128&q=60",
          }}
          style={{ width: 40, height: 40 }}
        />
      </View>
    </View>
  );
}

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: CTA_BG,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "900", color: "#ffffff" }}>{label}</Text>
    </View>
  );
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "900", color: fg }}>{label}</Text>
    </View>
  );
}

function AlertCard({
  accent,
  badge,
  badgeBg,
  badgeFg,
  iconName,
  iconBg,
  title,
  time,
  body,
  location,
  action,
  onAction,
  actionDisabled,
}: {
  accent: string;
  badge: string;
  badgeBg: string;
  badgeFg: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  title: string;
  time: string;
  body: string;
  location: string;
  action: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
        flexDirection: "row",
      }}
    >
      <View style={{ width: 4, backgroundColor: accent }} />
      <View style={{ flex: 1, padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
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
              <Ionicons name={iconName} size={16} color="#0f172a" />
            </View>
            <Tag label={badge} bg={badgeBg} fg={badgeFg} />
          </View>
          <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "800" }}>{time}</Text>
        </View>

        <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "900", color: "#0f172a" }}>{title}</Text>
        <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 18 }}>{body}</Text>

        <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="location-outline" size={14} color="#94a3b8" />
            <Text style={{ color: "#94a3b8", fontWeight: "700" }}>{location}</Text>
          </View>
          <Pressable
            onPress={onAction}
            disabled={actionDisabled}
            style={({ pressed }) => ({ opacity: actionDisabled ? 0.5 : pressed ? 0.85 : 1 })}
          >
            <Text style={{ color: BRAND_BLUE, fontWeight: "900", letterSpacing: 0.6 }}>{action}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function MonitoringMapCard() {
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: CTA_BG,
        height: 150,
      }}
    >
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=70",
        }}
        style={{ position: "absolute", width: "100%", height: "100%", opacity: 0.35 }}
      />

      <View style={{ flex: 1, padding: 14, justifyContent: "flex-end" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View
            style={{
              backgroundColor: "rgba(255,255,255,0.92)",
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 8,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#b91c1c" }} />
            <Text style={{ fontSize: 10, fontWeight: "900", color: "#0f172a" }}>
              MONITORING ACTIVE PERIMETER
            </Text>
          </View>

          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.18)",
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="settings-outline" size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const SEVERITY_STYLE: Record<
  string,
  { accent: string; badgeBg: string; badgeFg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  CRITICAL: { accent: "#991b1b", badgeBg: "#fee2e2", badgeFg: "#991b1b", icon: "warning" },
  HIGH: { accent: "#eab308", badgeBg: "#fef3c7", badgeFg: "#92400e", icon: "alert-circle" },
  MEDIUM: { accent: "#3b82f6", badgeBg: "#dbeafe", badgeFg: "#1d4ed8", icon: "information-circle" },
  LOW: { accent: "#cbd5e1", badgeBg: "#e2e8f0", badgeFg: "#475569", icon: "information-circle" },
};

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function AlertsScreen() {
  const [search, setSearch] = useState("");

  const { data: alerts, isLoading } = useQuery(trpc.alerts.listMine.queryOptions());

  const acknowledge = useMutation(
    trpc.alerts.acknowledge.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.alerts.listMine.queryKey() }),
    }),
  );

  const visible = (alerts ?? []).filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.title.toLowerCase().includes(q) || (a.description ?? "").toLowerCase().includes(q);
  });

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#0f172a" }}>Active Alerts</Text>
          <Pill label={`${visible.length} NEARBY`} />
        </View>

        <View
          style={{
            marginTop: 12,
            borderRadius: 12,
            backgroundColor: "#f1f5f9",
            borderWidth: 1,
            borderColor: "rgba(15, 23, 42, 0.06)",
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
          }}
        >
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Filter by title or description..."
            placeholderTextColor="#94a3b8"
            style={{ flex: 1, color: "#0f172a", fontWeight: "700", paddingVertical: 0 }}
          />
        </View>

        <View style={{ marginTop: 18, gap: 14 }}>
          {isLoading && <Text style={{ color: "#94a3b8" }}>Loading alerts...</Text>}
          {!isLoading && visible.length === 0 && (
            <Text style={{ color: "#94a3b8" }}>No active alerts for your area right now.</Text>
          )}
          {visible.map((a) => {
            const style = SEVERITY_STYLE[a.severity] ?? SEVERITY_STYLE.MEDIUM;
            const acknowledged = !!a.acknowledgedAt;
            return (
              <AlertCard
                key={a.id}
                accent={style.accent}
                badge={a.severity}
                badgeBg={style.badgeBg}
                badgeFg={style.badgeFg}
                iconName={style.icon}
                iconBg={style.badgeBg}
                title={a.title}
                time={getRelativeTime(new Date(a.createdAt))}
                body={a.description ?? ""}
                location={a.alertType.replace(/_/g, " ")}
                action={acknowledged ? "ACKNOWLEDGED" : "ACKNOWLEDGE"}
                actionDisabled={acknowledged || acknowledge.isPending}
                onAction={() => acknowledge.mutate({ alertId: a.id })}
              />
            );
          })}
        </View>

        <View style={{ marginTop: 18 }}>
          <MonitoringMapCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

