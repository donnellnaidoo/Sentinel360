import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { trpc } from "@/utils/trpc";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";

export default function ReportScreen() {
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);

  const submitSighting = useMutation(
    trpc.sightings.submit.mutationOptions({
      onSuccess: () => {
        setDescription("");
        setLocationAddress("");
      },
    }),
  );

  const canSubmit = description.trim().length > 0 && !submitSighting.isPending;

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
      {/* Header (same style as Home) */}
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

        <Text style={{ flex: 1, marginLeft: 10, fontSize: 20, fontWeight: "900", color: BRAND_BLUE }}>
          Community Safety
        </Text>

        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            overflow: "hidden",
            backgroundColor: "#e2e8f0",
          }}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=128&h=128&q=60",
            }}
            style={{ width: 40, height: 40 }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#0f172a" }}>Report Sighting</Text>
        <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 18 }}>
          Your immediate report helps keep the community safe. All fields are confidential.
        </Text>

        {/* Upload evidence */}
        <Pressable
          onPress={() => {}}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(15, 23, 42, 0.15)",
            borderStyle: "dashed",
            backgroundColor: "#ffffff",
            paddingVertical: 26,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.92 : 1,
          })}
        >
          <View
            style={{
              width: 54,
              height: 54,
              borderRadius: 14,
              backgroundColor: "rgba(30, 58, 138, 0.10)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="camera-outline" size={22} color={BRAND_BLUE} />
          </View>
          <Text style={{ marginTop: 12, fontWeight: "900", color: "#0f172a" }}>Upload Evidence</Text>
          <Text style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
            Tap to capture or select from gallery
          </Text>
        </Pressable>

        {/* Location */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>Location</Text>
          <View
            style={{
              marginTop: 10,
              borderRadius: 14,
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "rgba(15, 23, 42, 0.08)",
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="location-sharp" size={16} color={BRAND_BLUE} />
            <TextInput
              value={locationAddress}
              onChangeText={setLocationAddress}
              placeholder="Where did this happen? (e.g. Oakwood Heights, Block C-12)"
              placeholderTextColor="#94a3b8"
              style={{ flex: 1, color: "#0f172a", fontWeight: "700", paddingVertical: 0 }}
            />
          </View>
        </View>

        {/* Sighting description */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>Sighting Description</Text>
          <View
            style={{
              marginTop: 10,
              borderRadius: 14,
              backgroundColor: "#f8fafc",
              borderWidth: 1,
              borderColor: "rgba(15, 23, 42, 0.08)",
              padding: 12,
              minHeight: 120,
            }}
          >
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Provide details about the individual, clothing, or behavior observed..."
              placeholderTextColor="#94a3b8"
              multiline
              style={{
                color: "#0f172a",
                fontWeight: "600",
                lineHeight: 18,
                paddingVertical: 0,
              }}
            />
          </View>
        </View>

        {/* Anonymous toggle */}
        <Pressable
          onPress={() => setIsAnonymous((v) => !v)}
          style={({ pressed }) => ({
            marginTop: 18,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name={isAnonymous ? "checkbox" : "square-outline"} size={20} color={BRAND_BLUE} />
          <Text style={{ color: "#0f172a", fontWeight: "700" }}>Submit anonymously</Text>
        </Pressable>

        {submitSighting.isSuccess && (
          <View style={{ marginTop: 16, backgroundColor: "#ecfdf5", borderRadius: 12, padding: 12 }}>
            <Text style={{ color: "#065f46", fontWeight: "800" }}>
              Sighting submitted — reference {submitSighting.data.referenceCode}
            </Text>
          </View>
        )}
        {submitSighting.isError && (
          <View style={{ marginTop: 16, backgroundColor: "#fef2f2", borderRadius: 12, padding: 12 }}>
            <Text style={{ color: "#991b1b", fontWeight: "700" }}>{submitSighting.error.message}</Text>
          </View>
        )}

        <Pressable
          disabled={!canSubmit}
          onPress={() =>
            submitSighting.mutate({
              description,
              location: locationAddress ? { address: locationAddress } : undefined,
              isAnonymous,
            })
          }
          style={({ pressed }) => ({
            marginTop: 18,
            backgroundColor: BRAND_BLUE,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1,
          })}
        >
          {submitSighting.isPending && <ActivityIndicator color="#ffffff" />}
          <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 16 }}>
            {submitSighting.isPending ? "Submitting..." : "Submit Report"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

