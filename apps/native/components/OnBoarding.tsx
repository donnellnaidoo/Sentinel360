import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Dimensions,
  StatusBar,
  type ListRenderItemInfo,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

type OnboardingItem = {
  id: string;
  title: string;
  description: string;
  tag: string;
};

const HERO_BG = "#0b1f22";
const HERO_ACCENT = "#0e6d7a";
const SHEET_BG = "#ffffff";
const CTA_BG = "#0b2e4a";

const OnboardingScreen = () => {
  const onboardingData: OnboardingItem[] = useMemo(
    () => [
      {
        id: "1",
        tag: "COMMUNITY FIRST",
        title: "Stay informed about\nyour community",
        description:
          "Real-time alerts and verified reports\nfrom neighbors to keep your\nneighborhood secure and connected.",
      },
      {
        id: "2",
        tag: "SEE IT. SHARE IT.",
        title: "Submit sightings\nin seconds",
        description:
          "Help close coverage gaps by sending\nverified sightings to law enforcement\nfor review and action.",
      },
      {
        id: "3",
        tag: "SAFER TOGETHER",
        title: "Verified updates,\ntrusted outcomes",
        description:
          "Community reports are reviewed before\nthey influence operational decisions,\nkeeping the pipeline credible.",
      },
    ],
    [],
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace("/sign-up");
    }
  };

  const handleSkip = () => {
    router.replace("/sign-in");
  };

  const renderItem = ({ item }: ListRenderItemInfo<OnboardingItem>) => {
    return (
      <View
        style={{
          width,
          backgroundColor: HERO_BG,
          flex: 1,
        }}
      >
        <View className="flex-1">
          {/* Hero */}
          <View className="px-7 pt-10 pb-6" style={{ height: Math.max(340, height * 0.46) }}>
            <Text
              className="font-extrabold tracking-wider"
              style={{ fontSize: 44, color: HERO_ACCENT, letterSpacing: 2 }}
            >
              ONBOARDING
            </Text>

            <Text className="mt-2 text-xs leading-4" style={{ color: "rgba(255,255,255,0.55)" }}>
              Sentinel360 helps communities stay connected with real-time alerts and verified
              reports.
            </Text>

            {/* Center icon */}
            <View className="items-center justify-center mt-10">
              <Ionicons name="person-circle-outline" size={92} color="rgba(255,255,255,0.35)" />
            </View>

            {/* Alert card */}
            <View className="items-center mt-6">
              <View
                style={{
                  width: Math.min(260, width - 64),
                  backgroundColor: "rgba(255,255,255,0.92)",
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  shadowColor: "#000",
                  shadowOpacity: 0.18,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: 8,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      backgroundColor: "#7b0a0a",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 10,
                    }}
                  >
                    <MaterialCommunityIcons name="alarm-light-outline" size={22} color="#fff" />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[11px] font-semibold" style={{ color: "#111827" }}>
                      NEW ALERT
                    </Text>
                    <Text className="text-[12px] font-semibold" style={{ color: "#111827" }}>
                      Main St. Secure
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Bottom sheet */}
          <View
            style={{
              backgroundColor: SHEET_BG,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              paddingHorizontal: 28,
              paddingTop: 22,
              paddingBottom: 24,
              flex: 1,
            }}
          >
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#f6c343",
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 999,
                marginBottom: 14,
              }}
            >
              <Text className="text-[10px] font-semibold" style={{ color: "#1f2937" }}>
                {item.tag}
              </Text>
            </View>

            <Text className="text-[30px] font-semibold leading-9" style={{ color: "#0f172a" }}>
              {item.title}
            </Text>

            <Text className="mt-3 text-[13px] leading-5" style={{ color: "#6b7280" }}>
              {item.description}
            </Text>

            {/* Footer */}
            <View className="flex-row items-center justify-between mt-auto pt-8">
              <View className="flex-row items-center">
                {onboardingData.map((_, index) => (
                  <View
                    key={index}
                    style={{
                      height: 6,
                      borderRadius: 999,
                      marginRight: 8,
                      width: index === currentIndex ? 22 : 6,
                      backgroundColor:
                        index === currentIndex ? "#0b1f22" : "rgba(15, 23, 42, 0.20)",
                    }}
                  />
                ))}
              </View>

              {currentIndex === onboardingData.length - 1 ? (
                <View className="items-end gap-3">
                  <Pressable
                    onPress={() => router.replace("/sign-up")}
                    style={({ pressed }) => ({
                      backgroundColor: CTA_BG,
                      paddingHorizontal: 18,
                      paddingVertical: 12,
                      borderRadius: 10,
                      opacity: pressed ? 0.9 : 1,
                      flexDirection: "row",
                      alignItems: "center",
                    })}
                  >
                    <Text className="text-white font-semibold mr-2">Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </Pressable>

                  <Pressable onPress={() => router.replace("/sign-in")}>
                    <Text style={{ color: CTA_BG, fontWeight: "700" }}>Sign In</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleNext}
                  style={({ pressed }) => ({
                    backgroundColor: CTA_BG,
                    paddingHorizontal: 22,
                    paddingVertical: 12,
                    borderRadius: 10,
                    opacity: pressed ? 0.9 : 1,
                    flexDirection: "row",
                    alignItems: "center",
                  })}
                >
                  <Text className="text-white font-semibold mr-2">Next</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: HERO_BG }}>
      <StatusBar barStyle="light-content" backgroundColor={HERO_BG} />

      <Pressable
        onPress={handleSkip}
        style={({ pressed }) => ({
          position: "absolute",
          top: 16,
          right: 18,
          zIndex: 10,
          opacity: pressed ? 0.8 : 1,
          paddingVertical: 6,
          paddingHorizontal: 8,
        })}
      >
        <Text style={{ color: "rgba(255,255,255,0.78)", fontWeight: "600" }}>Skip</Text>
      </Pressable>

      {/* FlatList for Swipeable Onboarding */}
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />
    </SafeAreaView>
  );
};

export default OnboardingScreen;