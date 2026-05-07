import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";

export default function ReportScreen() {
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

        {/* Detected location */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>Detected Location</Text>
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
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  backgroundColor: "rgba(30, 58, 138, 0.10)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="location-sharp" size={16} color={BRAND_BLUE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#0f172a", fontWeight: "900" }}>
                  Oakwood Heights, Block C-12
                </Text>
                <Text style={{ marginTop: 2, fontSize: 10, color: "#94a3b8", fontWeight: "800" }}>
                  GPS ACCURACY: HIGH
                </Text>
              </View>
            </View>

            <View
              style={{
                width: 56,
                height: 34,
                borderRadius: 10,
                overflow: "hidden",
                backgroundColor: "#cbd5e1",
              }}
            >
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=160&h=120&q=50",
                }}
                style={{ width: 56, height: 34 }}
              />
            </View>
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
      </ScrollView>
    </SafeAreaView>
  );
}

