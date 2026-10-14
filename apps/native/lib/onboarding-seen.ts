import * as SecureStore from "expo-secure-store";

const ONBOARDING_SEEN_KEY = "sentinel360.onboardingSeen";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(ONBOARDING_SEEN_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await SecureStore.setItemAsync(ONBOARDING_SEEN_KEY, "1");
  } catch {
    // The screen can still continue if the phone cannot store the flag.
  }
}
