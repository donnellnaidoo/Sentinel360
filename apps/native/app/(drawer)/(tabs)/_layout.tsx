import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";
import { UserLocationProvider } from "@/contexts/user-location-context";

export default function TabLayout() {
  const themeColorForeground = useThemeColor("foreground");
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const active = colors.brand;
  const inactive = colors.textMuted;
  const tabPaddingBottom = Math.max(insets.bottom, 10);

  return (
    <UserLocationProvider>
    <Tabs
      screenOptions={{
        headerShown: false,
        headerStyle: {
          backgroundColor: colors.sheetBg,
        },
        headerTintColor: themeColorForeground,
        headerTitleStyle: {
          color: themeColorForeground,
          fontWeight: "600",
        },
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 2,
        },
        tabBarActiveBackgroundColor: isDark ? "rgba(147, 197, 253, 0.12)" : "rgba(30, 58, 138, 0.10)",
        tabBarItemStyle: {
          borderRadius: 16,
          marginHorizontal: 6,
          paddingVertical: 6,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + tabPaddingBottom,
          paddingBottom: tabPaddingBottom,
          paddingTop: 10,
          paddingHorizontal: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="notifications-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="wanted"
        options={{
          title: "Wanted",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: "Report",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }: { color: string; size: number }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
    </UserLocationProvider>
  );
}
