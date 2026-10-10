import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AccountAvatarButton } from "@/lib/account-profile";
import { useAppTheme } from "@/contexts/app-theme-context";
import { trpc } from "@/utils/trpc";

const CTA_BG = "#0b2e4a";

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
      <Text style={{ flex: 1, fontSize: 20, fontWeight: "900", color: colors.brand }}>
        Community Safety
      </Text>

      <AccountAvatarButton />
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
      <Text style={{ fontSize: 10, fontWeight: "900", color: fg, letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons name={icon} size={14} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontWeight: "600", flexShrink: 1 }}>{text}</Text>
    </View>
  );
}

function WantedCard({
  topTag,
  topTagBg,
  topTagFg,
  name,
  subtitle,
  lastSeen,
  updated,
  primaryCta,
  onPrimaryPress,
  imageUri,
  onPress,
}: {
  topTag: string;
  topTagBg: string;
  topTagFg: string;
  name: string;
  subtitle: string;
  lastSeen: string;
  updated: string;
  primaryCta?: string;
  onPrimaryPress?: () => void;
  imageUri: string;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View details for ${name}`}
      style={({ pressed }) => ({
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: colors.surface,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
        opacity: pressed ? 0.94 : 1,
      })}
    >
      <View style={{ height: 260, backgroundColor: "#cbd5e1" }}>
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <Tag label={topTag} bg={topTagBg} fg={topTagFg} />
        </View>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: colors.text }}>{name}</Text>
        <Text style={{ marginTop: 4, color: colors.textMuted, fontWeight: "600" }}>{subtitle}</Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          <MetaRow icon="location-outline" text={lastSeen} />
          <MetaRow icon="calendar-outline" text={updated} />
        </View>

        {!!primaryCta && (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onPrimaryPress?.();
            }}
            style={({ pressed }) => ({
              marginTop: 14,
              backgroundColor: colors.chip,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: colors.text }}>{primaryCta}</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function SafetyTipCard({ onPress }: { onPress: () => void }) {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: CTA_BG,
        padding: 16,
        overflow: "hidden",
      }}
    >
      <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.8)" />
      <Text style={{ marginTop: 10, fontSize: 22, fontWeight: "900", color: "#ffffff" }}>
        Stay Safe. Stay{"\n"}Vigilant.
      </Text>
      <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.78)", lineHeight: 18 }}>
        If you have any information regarding these individuals, do not approach them. Use our secure,
        encrypted tip system.
      </Text>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({
          marginTop: 14,
          backgroundColor: "#ffffff",
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Text style={{ fontWeight: "900", color: CTA_BG }}>SUBMIT SECURE TIP</Text>
      </Pressable>
    </View>
  );
}

const WATCHLIST_TAG: Record<string, { label: string; bg: string; fg: string }> = {
  CRITICAL: { label: "WANTED", bg: "#fee2e2", fg: "#991b1b" },
  HIGH: { label: "WANTED", bg: "#fee2e2", fg: "#991b1b" },
  MEDIUM: { label: "UNDER INVESTIGATION", bg: "#fef3c7", fg: "#92400e" },
  LOW: { label: "ADVISORY", bg: "#e2e8f0", fg: "#475569" },
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=900&q=70";

function getRelativeTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function formatEntityType(entityType: string): string {
  return entityType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function WantedScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const {
    data: wanted,
    isLoading,
    isError,
    error,
  } = useQuery(trpc.profiles.listPublicWanted.queryOptions());

  function goToReport() {
    router.push("/(drawer)/(tabs)/report");
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Tag label="ACTIVE ALERTS" bg="#fee2e2" fg="#991b1b" />

        <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "900", color: colors.text }}>
          Wanted Persons
        </Text>
        <Text style={{ marginTop: 8, color: colors.textMuted, lineHeight: 18 }}>
          Official public safety repository for individuals with outstanding warrants or active investigations
          in Auckland Park. Help secure your neighbourhood through informed vigilance.
        </Text>

        <View style={{ marginTop: 18, gap: 16 }}>
          {isLoading && <Text style={{ color: colors.textMuted }}>Loading wanted persons...</Text>}
          {isError && (
            <Text style={{ color: "#b91c1c", fontWeight: "700" }}>
              Failed to load wanted persons: {error?.message ?? "Unknown error"}
            </Text>
          )}
          {!isLoading && !isError && (wanted ?? []).length === 0 && (
            <Text style={{ color: "#94a3b8" }}>No active watchlist entries right now.</Text>
          )}
          {wanted?.map((entity) => {
            const tag = WATCHLIST_TAG[entity.watchlistStatus] ?? WATCHLIST_TAG.MEDIUM;
            const charges =
              entity.charges && entity.charges.length > 0 ? entity.charges.join(" · ") : null;
            const subtitle =
              charges ??
              entity.physicalDescription ??
              formatEntityType(entity.entityType);
            const lastSeen = entity.lastSeenAt
              ? `Last seen: ${getRelativeTime(new Date(entity.lastSeenAt))}`
              : "Last seen: Auckland Park area";
            const updated = entity.updatedAt
              ? `Updated: ${getRelativeTime(new Date(entity.updatedAt))}`
              : "Updated: recently";

            return (
              <WantedCard
                key={entity.id}
                topTag={tag.label}
                topTagBg={tag.bg}
                topTagFg={tag.fg}
                name={entity.displayName ?? "Unidentified subject"}
                subtitle={subtitle}
                lastSeen={lastSeen}
                updated={updated}
                imageUri={entity.primaryFaceImageUrl ?? FALLBACK_IMAGE}
                primaryCta="View details"
                onPrimaryPress={() => router.push(`/wanted/${entity.id}`)}
                onPress={() => router.push(`/wanted/${entity.id}`)}
              />
            );
          })}

          <SafetyTipCard onPress={goToReport} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
