import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Drawer } from "expo-router/drawer";
import React, { useCallback } from "react";
import { Text } from "react-native";

import { ThemeToggle } from "@/components/theme-toggle";
import { useAppTheme } from "@/contexts/app-theme-context";

function DrawerLayout() {
  const { colors } = useAppTheme();

  const renderThemeToggle = useCallback(() => <ThemeToggle />, []);

  return (
    <Drawer
      screenOptions={{
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.sheetBg },
        headerTitleStyle: {
          fontWeight: "600",
          color: colors.text,
        },
        headerRight: renderThemeToggle,
        drawerStyle: { backgroundColor: colors.sheetBg },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          headerTitle: "Home",
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : colors.text }}>Home</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <Ionicons
              name="home-outline"
              size={size}
              color={focused ? color : colors.text}
            />
          ),
        }}
      />
      <Drawer.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          drawerLabel: ({ color, focused }) => (
            <Text style={{ color: focused ? color : colors.text }}>Tabs</Text>
          ),
          drawerIcon: ({ size, color, focused }) => (
            <MaterialIcons
              name="border-bottom"
              size={size}
              color={focused ? color : colors.text}
            />
          ),
        }}
      />
    </Drawer>
  );
}

export default DrawerLayout;
