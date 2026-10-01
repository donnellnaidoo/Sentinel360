import "@/global.css";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { View } from "react-native";

import { AppThemeProvider, useAppTheme } from "@/contexts/app-theme-context";
import { SessionProvider } from "@/contexts/session-context";
import { queryClient } from "@/utils/trpc";

export const unstable_settings = {
  initialRouteName: "onboarding",
};

function StackLayout() {
  return (
    <Stack screenOptions={{}}>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password-confirm" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ headerShown: false }} />
      <Stack.Screen name="change-password-new" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      <Stack.Screen name="notification-preferences" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-safety" options={{ headerShown: false }} />
      <Stack.Screen name="home-neighborhood" options={{ headerShown: false }} />
      <Stack.Screen name="my-sightings" options={{ headerShown: false }} />
      <Stack.Screen name="secure-tips" options={{ headerShown: false }} />
      <Stack.Screen name="help-center" options={{ headerShown: false }} />
      <Stack.Screen name="terms-privacy" options={{ headerShown: false }} />
      <Stack.Screen name="wanted/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ title: "Modal", presentation: "modal" }} />
    </Stack>
  );
}

function ThemedStatusBar() {
  const { isDark, colors } = useAppTheme();
  return <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.sheetBg} />;
}

function ThemedApp() {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <HeroUINativeProvider>
        <ThemedStatusBar />
        <StackLayout />
      </HeroUINativeProvider>
    </View>
  );
}

export default function Layout() {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppThemeProvider>
              <ThemedApp />
            </AppThemeProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </SessionProvider>
  );
}
