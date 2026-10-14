import { Text, View } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { formatSightingDate, sightingStatusLabel } from "@/lib/account-activity";

export function AccountSightingCard({
  referenceCode,
  description,
  moderationStatus,
  createdAt,
  place,
}: {
  referenceCode: string;
  description: string;
  moderationStatus: string;
  createdAt: string | Date;
  place: string | null;
}) {
  const { colors } = useAppTheme();
  const when = formatSightingDate(createdAt);

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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ flex: 1, fontWeight: "900", color: colors.text, fontSize: 15 }}>{referenceCode}</Text>
        <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textMuted }}>
          {sightingStatusLabel(moderationStatus)}
        </Text>
      </View>
      <Text style={{ marginTop: 6, color: colors.text, fontWeight: "600", lineHeight: 20 }} numberOfLines={3}>
        {description}
      </Text>
      {(!!place || !!when) && (
        <Text style={{ marginTop: 8, color: colors.textMuted, fontWeight: "600", fontSize: 12 }}>
          {[place, when].filter(Boolean).join(" · ")}
        </Text>
      )}
    </View>
  );
}
