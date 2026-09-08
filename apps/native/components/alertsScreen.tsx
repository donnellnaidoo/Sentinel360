import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { queryClient, trpc } from "@/utils/trpc";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";
const CTA_BG = "#0b2e4a";

function Header() {
  const router = useRouter();

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

      <Pressable
        onPress={() => router.push("/(drawer)/(tabs)/profile")}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        style={({ pressed }) => ({
          width: 40,
          height: 40,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#e2e8f0",
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Image
          source={{
            uri: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=128&h=128&q=60",
          }}
          style={{ width: 40, height: 40 }}
        />
      </Pressable>
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
  onPress,
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
  onPress?: () => void;
}) {
  return (
    <Pressable
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
      onPress={onPress}
      disabled={!onPress}
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 12 }}>
            <Ionicons name="location-outline" size={14} color="#94a3b8" />
            <Text style={{ color: "#94a3b8", fontWeight: "700", flexShrink: 1 }}>{location}</Text>
          </View>
          <Pressable
            onPress={(event) => {event.stopPropagation(); onAction?.();}}
            disabled={actionDisabled}
            style={({ pressed }) => ({ opacity: actionDisabled ? 0.5 : pressed ? 0.85 : 1 })}
          >
            <Text style={{ color: BRAND_BLUE, fontWeight: "900", letterSpacing: 0.6 }}>{action}</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
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
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.92)",
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            alignSelf: "flex-start",
          }}
        >
          <View style={{ width: 10, height: 10, borderRadius: 999, backgroundColor: "#b91c1c" }} />
          <Text style={{ fontSize: 10, fontWeight: "900", color: "#0f172a" }}>
            MONITORING AUCKLAND PARK
          </Text>
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

function formatAlertLocation(location: unknown, fallback: string): string {
  if (!location || typeof location !== "object") return fallback;
  const loc = location as Record<string, unknown>;
  if (typeof loc.address === "string" && loc.address.trim()) return loc.address.trim();
  if (typeof loc.label === "string" && loc.label.trim()) return loc.label.trim();
  if (typeof loc.name === "string" && loc.name.trim()) return loc.name.trim();
  const lat = typeof loc.latitude === "number" ? loc.latitude : typeof loc.lat === "number" ? loc.lat : null;
  const lng =
    typeof loc.longitude === "number" ? loc.longitude : typeof loc.lng === "number" ? loc.lng : null;
  if (lat != null && lng != null) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return fallback;
}

function formatSightingLocation(location: unknown): string {
  if(!location || typeof location !== "object")
  {
    return "Location unavailable";
  }

  const loc = location as Record<string, unknown>;

  if(typeof loc.address === "string" && loc.address.trim())
  {
    return loc.address.trim();
  }

  if(typeof loc.label === "string" && loc.label.trim())
  {
    return loc.label.trim();
  }

  if (typeof loc.name === "string" && loc.name.trim()) {
    return loc.name.trim();
  }

  return "Location unavailable";
} 

function formatDateTime(value: string | Date | null | undefined): string {
  if(!value)
  {
    return "Not specified";
  }

  const date = new Date(value);

  if(Number.isNaN(date.getTime()))
  {
    return "Not specified";
  }

  return date.toLocaleString();
}

export default function AlertsScreen() {
  const [search, setSearch] = useState("");
  const [selectedSightingId, setSelectedSightingId] = useState<string | null>(null);

  const {
    data: alerts = [],
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useQuery({...trpc.alerts.listMine.queryOptions(), refetchOnMount: "always", refetchOnReconnect: true,});

  const sightingQuery = useQuery({
    ...trpc.sightings.getPublicById.queryOptions({
      id: selectedSightingId ?? "",
    }),
    enabled: Boolean(selectedSightingId),
  });

  console.log("Selected sighting:", sightingQuery.data,);

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const acknowledge = useMutation(
    trpc.alerts.acknowledge.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.alerts.listMine.queryKey(),
          }),

          queryClient.invalidateQueries({
            queryKey: trpc.alerts.unreadCount.queryKey(),
          }),
        ]);
      },
    }),
  );

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return alerts;
    return alerts.filter((alert) => {
      return (
        (alert.title ?? "").toLowerCase().includes(query) ||
        (alert.description ?? alert.message ?? "")
          .toLowerCase()
          .includes(query) ||
        (alert.alertType ?? "").toLowerCase().includes(query) ||
        (alert.severity ?? "").toLowerCase().includes(query)
      );
    });
  }, [alerts, search]);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => void refetch()} 
          />
        }
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: "#0f172a" }}>Active Alerts</Text>
          <Pill label={`${visible.length} ACTIVE`} />
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

        {isError && (
          <Text style={{ marginTop: 12, color: "#b91c1c", fontWeight: "700" }}>
            Failed to load alerts: {error?.message ?? "Unknown error"}
          </Text>
        )}

        <View style={{ marginTop: 18, gap: 14 }}>
          {isLoading && <Text style={{ color: "#94a3b8" }}>Loading alerts...</Text>}
          {!isLoading && !isError && visible.length === 0 && (
            <Text style={{ color: "#94a3b8" }}>No active alerts for Auckland Park right now.</Text>
          )}
          {visible.map((alert) => {
            const style = SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.MEDIUM;
            const acknowledged = Boolean(alert.acknowledgedAt);
            const isSightingAlert = alert.sourceEntityType === "COMMUNITY_SIGHTING" && Boolean(alert.sourceEntityId);

            return (
              <AlertCard
                key={alert.id}
                accent={style.accent}
                badge={alert.severity}
                badgeBg={style.badgeBg}
                badgeFg={style.badgeFg}
                iconName={style.icon}
                iconBg={style.badgeBg}
                title={alert.title}
                time={getRelativeTime(new Date(alert.createdAt))}
                body={alert.description ?? alert.message}
                location={formatAlertLocation(alert.location, alert.alertType.replace(/_/g, " "))}
                action={acknowledged ? "ACKNOWLEDGED" : "ACKNOWLEDGE"}
                actionDisabled={acknowledged || acknowledge.isPending}
                onAction={() => acknowledge.mutate({ alertId: alert.id })}
                onPress={isSightingAlert ? () => setSelectedSightingId(alert.sourceEntityId!) : undefined}
              />
            );
          })}
        </View>

        <View style={{ marginTop: 18 }}>
          <MonitoringMapCard />
        </View>

        <Modal
          visible={Boolean(selectedSightingId)}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedSightingId(null)}
        >

          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: "#ffffff",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                maxHeight: "88%",
                paddingTop: 18,
              }}
            >

              <View
                style={{
                  paddingHorizontal: 18,
                  paddingBottom: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: "#e2e8f0",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >

                <View>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "900",
                      color: "#0f172a",
                    }}
                  >
                    Sighting Details
                  </Text>

                  {sightingQuery.data?.referenceCode && (
                    <Text
                      style={{
                        marginTop: 4,
                        color: "#64748b",
                        fontWeight: "700",
                      }}
                    >
                      {sightingQuery.data.referenceCode}
                    </Text>
                  )}
                </View>

                <Pressable
                  onPress={() => setSelectedSightingId(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Close sighting details"
                  style={({ pressed }) => ({
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#f1f5f9",
                    opacity: pressed ? 0.75 : 1,
                  })}
                >

                  <Ionicons
                    name="close"
                    size={22}
                    color="#0f172a"
                  />
                </Pressable>
              </View>

              <ScrollView
                contentContainerStyle={{
                  padding: 18,
                  paddingBottom: 36,
                }}
                showsVerticalScrollIndicator={false}
              >
                {/* Load Query or Loading Query */}
                {sightingQuery.isLoading && (
                  <Text
                    style={{
                      color: "#64748b",
                      fontWeight: "700",
                    }}
                  >
                    Loading sighting details...
                  </Text>
                )}

                {/* Error check */}
                {sightingQuery.isError && (
                  <View
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: "#fee2e2",
                    }}
                  >
                    <Text
                      style={{
                        color: "#991b1b",
                        fontWeight: "800",
                      }}
                    >
                      Failed to load sighting: {" "}
                      {sightingQuery.error?.message ?? "Unknown error"}
                    </Text>
                  </View>
                )}

                {/* Sighting Data */}
                {sightingQuery.data && (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 16,
                      }}
                    >

                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 999,
                          backgroundColor: "#dcfce7",
                        }}
                      >

                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "900",
                            color: "#166534",
                          }}
                        >
                          APPROVED
                        </Text>
                      </View>

                      <Text
                        style={{
                          color: "#64747b",
                          fontWeight: "700",
                        }}
                      >
                        {sightingQuery.data.sightingType}
                      </Text>
                    </View>

                    {sightingQuery.data.media?.length > 0 && (
                      <View
                        style={{
                          marginBottom: 18,
                          borderRadius: 16,
                          overflow: "hidden",
                          backgroundColor: "#e2e8f0",
                        }}
                      >

                        <Image
                          source={{
                            uri:
                              sightingQuery.data.media[0]
                              ?.storageUrl,
                          }}
                          style={{
                            width: "100%",
                            height: 220,
                          }}
                          resizeMode="cover"
                        />
                      </View>
                    )}

                    <Text
                      style={{
                        fontSize: 13,
                        color: "#64748b",
                        fontWeight: "800",
                      }}
                    >
                      DESCRIPTION
                    </Text>

                    <Text
                      style={{
                        marginTop: 6,
                        fontSize: 16,
                        lineHeight: 23,
                        color: "#0f172a",
                      }}
                    >
                      {sightingQuery.data.description}
                    </Text>

                    <View
                      style={{
                        marginTop: 20,
                        gap: 14,
                      }}
                    >

                      <View
                        style={{
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >

                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={BRAND_BLUE}
                        />

                        <View
                          style={{ flex: 1 }}
                        >

                          <Text
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              fontWeight: "800",
                            }}
                          >
                            LOCATION
                          </Text>

                          <Text
                            style={{
                              marginTop: 3,
                              color: "#0f172a",
                              fontWeight: "700",
                            }}
                          >
                            {formatSightingLocation(sightingQuery.data.location,)}
                          </Text>
                        </View>
                      </View>


                      <View
                        style={{
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >

                        <Ionicons
                          name="time-outline"
                          size={20}
                          color={BRAND_BLUE}
                        />

                        <View
                          style={{
                            flex: 1,
                          }}
                        >

                          <Text
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              fontWeight: "800",
                            }}
                          >
                            OBSERVED
                          </Text>


                          <Text
                            style={{
                              marginTop: 3,
                              color: "#0f172a",
                              fontWeight: "700",
                            }}
                          >
                            {formatDateTime(
                              sightingQuery.data.occurredAt ??
                              sightingQuery.data.reportedAt ?? 
                              sightingQuery.data.createdAt,
                            )}
                          </Text>
                        </View>
                      </View>
                    </View>

                    
                    {/* Moderation Reason */}
                    {sightingQuery.data.moderationReason && (
                      <View
                        style={{
                          marginTop: 20,
                          padding: 14,
                          borderRadius: 14,
                          backgroundColor: "#f8fafc",
                          borderWidth: 1,
                          borderColor: "#e2e8f0",
                        }}
                      >

                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "900",
                            color: "#64748b",
                          }}
                        >
                          MODERATOR NOTE
                        </Text>

                        <Text
                          style={{
                            marginTop: 6,
                            color: "#334155",
                            lineHeight: 20,
                          }}
                        >
                          {
                            sightingQuery.data.moderationReason
                          }
                        </Text>
                      </View>
                    )}

                    <Pressable
                      onPress={() => setSelectedSightingId(null)}
                      style={({ pressed }) => ({
                        marginTop: 24,
                        backgroundColor: CTA_BG,
                        borderRadius: 14,
                        alignItems: "center",
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >

                      <Text
                        style={{
                          color: "#ffffff",
                          fontWeight: "900",
                          letterSpacing: 0.5,
                        }}
                      >
                        CLOSE
                      </Text>
                    </Pressable>
                  </>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}
