import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileRoute() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ padding: 18 }}>
        <Text style={{ fontSize: 18, fontWeight: "900", color: "#0b1f22" }}>Profile</Text>
        <Text style={{ marginTop: 8, color: "#64748b" }}>Placeholder screen.</Text>
      </View>
    </SafeAreaView>
  );
}

