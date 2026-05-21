import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";


const HERO_BG = "#0b1f22";
const HERO_ACCENT = "#0e6d7a";
const SHEET_BG = "#ffffff";
const CTA_BG = "#0b2e4a";
const BRAND_BLUE = "#1e3a8a";

function Pill({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(255,255,255,0.18)",
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: "flex-start",
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 999, backgroundColor: "#facc15" }} />
      <Text style={{ color: "#fff", fontWeight: "700" }}>{label}</Text>
    </View>
  );
}

function CommunityItem({
  tag,
  title,
  time,
}: {
  tag: { label: string; bg: string; fg: string };
  title: string;
  time: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 14,
        padding: 12,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 12,
          backgroundColor: "#e2e8f0",
        }}
      />

      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              backgroundColor: tag.bg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 10, fontWeight: "900", color: tag.fg }}>{tag.label}</Text>
          </View>
          <Text style={{ fontSize: 11, color: "#64748b", fontWeight: "700" }}>{time}</Text>
        </View>
        <Text style={{ marginTop: 6, color: "#0f172a", fontWeight: "800" }}>{title}</Text>
        <Text style={{ marginTop: 2, color: "#94a3b8", fontSize: 12 }}>
          Installation of smart LED lights begins this Monday...
        </Text>
      </View>
    </View>
  );
}

function AlertItem({
  accent,
  iconBg,
  icon,
  title,
  subtitle,
  status,
}: {
  accent: string;
  iconBg: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  status: string;
}) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 14,
        overflow: "hidden",
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 2,
      }}
    >
      <View style={{ width: 4, alignSelf: "stretch", backgroundColor: accent }} />
      <View style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name={icon} size={16} color="#0f172a" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#0f172a", fontWeight: "900" }}>{title}</Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: "#64748b", fontWeight: "600" }}>
            {subtitle}
          </Text>
          <Text style={{ marginTop: 2, fontSize: 12, color: "#94a3b8" }}>{status}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 11, color: "#94a3b8", fontWeight: "700" }}>15m{`\n`}ago</Text>
          <Ionicons name="ellipsis-vertical" size={14} color="#94a3b8" />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
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
        contentContainerStyle={{
          paddingHorizontal: 18,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            marginTop: 10,
            backgroundColor: CTA_BG,
            borderRadius: 18,
            padding: 18,
            overflow: "hidden",
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.75)", fontWeight: "800", letterSpacing: 1 }}>
            CURRENT REGION
          </Text>
          <Text style={{ marginTop: 8, fontSize: 30, fontWeight: "900", color: "#fff" }}>
            Oakwood{"\n"}District
          </Text>
          <View style={{ marginTop: 12 }}>
            <Pill label="Status: Safe" />
          </View>
        </View>

        <View
          style={{
            marginTop: 14,
            backgroundColor: "#fff",
            borderRadius: 18,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
            overflow: "hidden",
          }}
        >
            <MapView
              style={{ height: 150 }}
              initialRegion={{
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.012,
                longitudeDelta: 0.012,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker coordinate={{ latitude: 37.78825, longitude: -122.4324 }} />
              <Marker coordinate={{ latitude: 37.7905, longitude: -122.421 }} />
            </MapView>
          <Pressable
            style={({ pressed }) => ({
              paddingHorizontal: 14,
              paddingVertical: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{ color: "#1e3a8a", fontWeight: "800" }}>Nearby Activity</Text>

            <Ionicons name="chevron-forward" size={16} color="#64748b" />
          </Pressable>
        </View>

        <View style={{ marginTop: 22 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={{ fontSize: 18, fontWeight: "900", color: HERO_BG }}>Community Updates</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: "#94a3b8" }}>
                Verified announcements from your neighbors
              </Text>
            </View>
            <Pressable style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ color: HERO_BG, fontWeight: "900" }}>
                View{`\n`}all
              </Text>
            </Pressable>
          </View>

          <View style={{ marginTop: 14, gap: 12 }}>
            <CommunityItem
              tag={{ label: "CIVIC", bg: "#dbeafe", fg: "#1d4ed8" }}
              title="New Street Lighting Phase 1"
              time="2h ago"
            />
            <CommunityItem
              tag={{ label: "EVENT", bg: "#fef3c7", fg: "#92400e" }}
              title="Neighborhood Watch Meet"
              time="5h ago"
            />
          </View>
        </View>

        <View style={{ marginTop: 22 }}>
          <Text style={{ fontSize: 18, fontWeight: "900", color: HERO_BG }}>Recent Alerts</Text>
          <View style={{ marginTop: 12, gap: 12 }}>
            <AlertItem
              accent="#b91c1c"
              iconBg="#fee2e2"
              icon="alert-circle"
              title="Vehicle Theft Reported"
              subtitle="Blue Sedan, 5th Ave"
              status="Urgent"
            />
            <AlertItem
              accent="#eab308"
              iconBg="#fef3c7"
              icon="warning"
              title="Power Outage Scheduled"
              subtitle="North Quadrant"
              status="Maintenance"
            />
          </View>
        </View>
      </ScrollView>

      <Pressable
        onPress={() => {}}
        style={({ pressed }) => ({
          position: "absolute",
          right: 18,
          bottom: 28,
          width: 56,
          height: 56,
          borderRadius: 18,
          backgroundColor: CTA_BG,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

