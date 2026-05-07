import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";
const CTA_BG = "#0b2e4a";

function Header() {
  return (
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
  );
}

function Tag({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        backgroundColor: bg,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: "900", color: fg, letterSpacing: 0.5 }}>{label}</Text>
    </View>
  );
}

function MetaRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons name={icon} size={14} color="#64748b" />
      <Text style={{ color: "#64748b", fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

function WantedCard({
  topTag,
  topTagBg,
  topTagFg,
  name,
  subtitle,
  primaryCta,
  secondaryCta,
  imageUri,
  dark,
}: {
  topTag: string;
  topTagBg: string;
  topTagFg: string;
  name: string;
  subtitle: string;
  primaryCta?: string;
  secondaryCta?: string;
  imageUri: string;
  dark?: boolean;
}) {
  return (
    <View
      style={{
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#ffffff",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      <View style={{ height: 260, backgroundColor: "#cbd5e1" }}>
        <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} />
        <View style={{ position: "absolute", top: 12, right: 12 }}>
          <Tag label={topTag} bg={topTagBg} fg={topTagFg} />
        </View>
      </View>

      <View style={{ padding: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#0f172a" }}>{name}</Text>
        <Text style={{ marginTop: 4, color: "#64748b", fontWeight: "600" }}>{subtitle}</Text>

        <View style={{ marginTop: 12, gap: 8 }}>
          <MetaRow icon="location-outline" text="Last seen: East Waterfront District" />
          <MetaRow icon="calendar-outline" text="Updated: Yesterday" />
        </View>

        {!!primaryCta && (
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({
              marginTop: 14,
              backgroundColor: dark ? CTA_BG : "#e5e7eb",
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: dark ? "#ffffff" : "#0f172a" }}>{primaryCta}</Text>
          </Pressable>
        )}

        {!!secondaryCta && (
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({
              marginTop: 10,
              backgroundColor: CTA_BG,
              paddingVertical: 12,
              borderRadius: 12,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: "#ffffff" }}>{secondaryCta}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function SafetyTipCard() {
  return (
    <View
      style={{
        borderRadius: 16,
        backgroundColor: CTA_BG,
        padding: 16,
        overflow: "hidden",
      }}
    >
      <Ionicons name="shield-checkmark-outline" size={20} color="rgba(255,255,255,0.8)" />
      <Text style={{ marginTop: 10, fontSize: 22, fontWeight: "900", color: "#ffffff" }}>
        Stay Safe. Stay{"\n"}Vigilant.
      </Text>
      <Text style={{ marginTop: 10, color: "rgba(255,255,255,0.78)", lineHeight: 18 }}>
        If you have any information regarding these individuals, do not approach them. Use our secure,
        encrypted tip system.
      </Text>

      <Pressable
        onPress={() => {}}
        style={({ pressed }) => ({
          marginTop: 14,
          backgroundColor: "#ffffff",
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          opacity: pressed ? 0.92 : 1,
        })}
      >
        <Text style={{ fontWeight: "900", color: CTA_BG }}>SUBMIT SECURE TIP</Text>
      </Pressable>
    </View>
  );
}

export default function WantedScreen() {
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
      <Header />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Tag label="ACTIVE ALERTS" bg="#fee2e2" fg="#991b1b" />

        <Text style={{ marginTop: 10, fontSize: 26, fontWeight: "900", color: "#0f172a" }}>
          Wanted Persons
        </Text>
        <Text style={{ marginTop: 8, color: "#64748b", lineHeight: 18 }}>
          Official public safety repository for individuals with outstanding warrants or active investigations.
          Help secure your neighborhood through informed vigilance.
        </Text>

        <Pressable
          onPress={() => {}}
          style={({ pressed }) => ({
            marginTop: 14,
            alignSelf: "flex-start",
            backgroundColor: "#f1f5f9",
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <Ionicons name="options-outline" size={16} color="#0f172a" />
          <Text style={{ fontWeight: "800", color: "#0f172a" }}>Filters</Text>
        </Pressable>

        <View style={{ marginTop: 18, gap: 16 }}>
          <WantedCard
            topTag="WANTED"
            topTagBg="#fee2e2"
            topTagFg="#991b1b"
            name="Marcus Hale"
            subtitle="Armed robbery suspect"
            imageUri="https://i.pravatar.cc/900?img=13"
            secondaryCta="View Case File"
            dark
          />

          <WantedCard
            topTag="UNDER INVESTIGATION"
            topTagBg="#fef3c7"
            topTagFg="#92400e"
            name="Elena Rodriguez"
            subtitle="Cyber fraud syndicate"
            imageUri="https://images.unsplash.com/photo-1550525811-e5869dd03032?auto=format&fit=crop&w=900&q=70"
            primaryCta="Provide Anonymous Tip"
          />

          <SafetyTipCard />

          <WantedCard
            topTag="UNDER INVESTIGATION"
            topTagBg="#fef3c7"
            topTagFg="#92400e"
            name="Daniel Cross"
            subtitle="Organized crime suspect"
            imageUri="https://i.pravatar.cc/900?img=12"
            primaryCta="Provide Anonymous Tip"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

