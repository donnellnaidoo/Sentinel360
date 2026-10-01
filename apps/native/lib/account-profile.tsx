import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image, Pressable, Text } from "react-native";

import { useAppTheme } from "@/contexts/app-theme-context";
import { useSession } from "@/contexts/session-context";
import { trpc } from "@/utils/trpc";

function metaString(meta: Record<string, unknown> | undefined, key: string) {
  const value = meta?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function useAccountProfile() {
  const { session } = useSession();
  const meta = (session?.user?.user_metadata ?? undefined) as Record<string, unknown> | undefined;
  const { data } = useQuery({
    ...trpc.users.me.queryOptions(),
    enabled: !!session,
    retry: 1,
    staleTime: 30_000,
  });

  const sessionImage = metaString(meta, "avatar_url") || metaString(meta, "image") || metaString(meta, "picture");
  const sessionName = metaString(meta, "name") || metaString(meta, "full_name");
  const name =
    data?.name?.trim() || sessionName || session?.user?.email?.split("@")[0] || "Community Member";
  const email = data?.email || session?.user?.email || "";
  const image = data?.image || sessionImage;

  return {
    profile: data,
    name,
    email,
    image,
    initials: initialsFor(name),
  };
}

export function AccountAvatarButton({ size = 40, radius = 999 }: { size?: number; radius?: number }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { image, initials } = useAccountProfile();

  return (
    <Pressable
      onPress={() => router.push("/(drawer)/(tabs)/profile")}
      accessibilityRole="button"
      accessibilityLabel="Open profile"
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        backgroundColor: colors.chip,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.85 : 1,
      })}
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: size, height: size }} />
      ) : (
        <Text style={{ color: colors.brand, fontWeight: "900", fontSize: Math.max(12, Math.round(size * 0.36)) }}>
          {initials}
        </Text>
      )}
    </Pressable>
  );
}
