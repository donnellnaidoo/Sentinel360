import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";
import { trpc } from "@/utils/trpc";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=900&q=70";

const WATCHLIST_TAG: Record<string, { label: string; bg: string; fg: string }> = {
  CRITICAL: { label: "WANTED", bg: "#fee2e2", fg: "#991b1b" },
  HIGH: { label: "WANTED", bg: "#fee2e2", fg: "#991b1b" },
  MEDIUM: { label: "UNDER INVESTIGATION", bg: "#fef3c7", fg: "#92400e" },
  LOW: { label: "ADVISORY", bg: "#e2e8f0", fg: "#475569" },
};

function formatEntityType(entityType: string): string {
  return entityType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "Not available";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
      <Ionicons name={icon} size={18} color={colors.brand} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.6 }}>
          {label}
        </Text>
        <Text style={{ marginTop: 4, color: colors.text, fontWeight: "700", lineHeight: 20 }}>{value}</Text>
      </View>
    </View>
  );
}

export default function WantedPersonDetail() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : "";

  const { data, isLoading, isError, error } = useQuery({
    ...trpc.profiles.getPublicWantedById.queryOptions({ id }),
    enabled: Boolean(id),
  });

  const tag = WATCHLIST_TAG[data?.watchlistStatus ?? ""] ?? WATCHLIST_TAG.MEDIUM;
  const charges = data?.charges ?? [];
  const plates = data?.knownPlateNumbers ?? [];

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <View
        style={{
          height: 56,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.sheetBg,
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
          <Ionicons name="chevron-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 18, fontWeight: "900", color: colors.brand }}>Wanted details</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {!id && (
          <Text style={{ color: "#b91c1c", fontWeight: "700" }}>Missing wanted person id.</Text>
        )}
        {!!id && isLoading && <Text style={{ color: colors.textMuted }}>Loading details...</Text>}
        {isError && (
          <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
            {error?.message ?? "Could not load wanted person details."}
          </Text>
        )}

        {data && (
          <>
            <View
              style={{
                borderRadius: 18,
                overflow: "hidden",
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ height: 320, backgroundColor: colors.chip }}>
                <Image
                  source={{ uri: data.primaryFaceImageUrl ?? FALLBACK_IMAGE }}
                  style={{ width: "100%", height: "100%" }}
                />
                <View style={{ position: "absolute", top: 12, right: 12 }}>
                  <View
                    style={{
                      backgroundColor: tag.bg,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: "900", color: tag.fg, letterSpacing: 0.5 }}>
                      {tag.label}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>
                  {data.displayName ?? "Unidentified subject"}
                </Text>
                <Text style={{ marginTop: 6, color: colors.textMuted, fontWeight: "700" }}>
                  {formatEntityType(data.entityType)}
                  {data.priorityLevel ? ` · ${data.priorityLevel} priority` : ""}
                </Text>
              </View>
            </View>

            {charges.length > 0 && (
              <View style={{ marginTop: 16, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {charges.map((charge) => (
                  <View
                    key={charge}
                    style={{
                      backgroundColor: colors.dangerBg,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "900", color: colors.dangerText }}>{charge}</Text>
                  </View>
                ))}
              </View>
            )}

            <View
              style={{
                marginTop: 16,
                backgroundColor: colors.surface,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                gap: 16,
              }}
            >
              {!!data.watchlistReason && (
                <DetailRow icon="alert-circle-outline" label="WATCHLIST REASON" value={data.watchlistReason} />
              )}
              <DetailRow
                icon="person-outline"
                label="PHYSICAL DESCRIPTION"
                value={data.physicalDescription?.trim() || "No physical description published."}
              />
              {plates.length > 0 && (
                <DetailRow icon="car-outline" label="KNOWN PLATE NUMBERS" value={plates.join(" · ")} />
              )}
              <DetailRow icon="location-outline" label="LAST SEEN" value={formatDateTime(data.lastSeenAt)} />
              <DetailRow icon="time-outline" label="FIRST SEEN" value={formatDateTime(data.firstSeenAt)} />
              <DetailRow icon="refresh-outline" label="LAST UPDATED" value={formatDateTime(data.updatedAt)} />
            </View>

            <View
              style={{
                marginTop: 16,
                backgroundColor: colors.dangerBg,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <Text style={{ color: colors.dangerText, fontWeight: "700", lineHeight: 20 }}>
                Do not approach this person. If you have information, submit a secure tip.
              </Text>
            </View>

            <Pressable
              onPress={() =>
                router.push({ pathname: "/(drawer)/(tabs)/report", params: { profileId: id } })
              }
              style={({ pressed }) => ({
                marginTop: 16,
                backgroundColor: colors.cta,
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: "#ffffff" }}>Submit a secure tip</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
