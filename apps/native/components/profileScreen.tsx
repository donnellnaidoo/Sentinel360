import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { supabase } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";
const CTA_BG = "#0b2e4a";

export default function ProfileScreen() {
  const { data: me, isLoading } = useQuery(trpc.users.me.queryOptions());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (me) {
      setFirstName(me.firstName ?? "");
      setLastName(me.lastName ?? "");
      setPhoneNumber(me.phoneNumber ?? "");
    }
  }, [me]);

  const updateMe = useMutation(
    trpc.users.updateMe.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: trpc.users.me.queryKey() }),
    }),
  );

  if (isLoading || !me) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: SHEET_BG, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={BRAND_BLUE} />
      </SafeAreaView>
    );
  }

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
        <Text style={{ fontSize: 20, fontWeight: "900", color: BRAND_BLUE }}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 120 }}>
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 84,
              height: 84,
              borderRadius: 999,
              overflow: "hidden",
              backgroundColor: "#e2e8f0",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {me.image ? (
              <Image source={{ uri: me.image }} style={{ width: 84, height: 84 }} />
            ) : (
              <Ionicons name="person" size={36} color="#94a3b8" />
            )}
          </View>
          <Text style={{ marginTop: 12, fontSize: 20, fontWeight: "900", color: "#0f172a" }}>{me.name}</Text>
          <Text style={{ marginTop: 2, color: "#64748b" }}>{me.email}</Text>
        </View>

        <View style={{ marginTop: 24, gap: 14 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>First Name</Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={{
                marginTop: 8,
                borderRadius: 12,
                backgroundColor: "#f8fafc",
                borderWidth: 1,
                borderColor: "rgba(15, 23, 42, 0.08)",
                padding: 12,
                color: "#0f172a",
                fontWeight: "600",
              }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>Last Name</Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={{
                marginTop: 8,
                borderRadius: 12,
                backgroundColor: "#f8fafc",
                borderWidth: 1,
                borderColor: "rgba(15, 23, 42, 0.08)",
                padding: 12,
                color: "#0f172a",
                fontWeight: "600",
              }}
            />
          </View>
          <View>
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#0f172a" }}>Phone Number</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={{
                marginTop: 8,
                borderRadius: 12,
                backgroundColor: "#f8fafc",
                borderWidth: 1,
                borderColor: "rgba(15, 23, 42, 0.08)",
                padding: 12,
                color: "#0f172a",
                fontWeight: "600",
              }}
            />
          </View>
        </View>

        {updateMe.isSuccess && (
          <Text style={{ marginTop: 14, color: "#065f46", fontWeight: "700" }}>Profile updated.</Text>
        )}
        {updateMe.isError && (
          <Text style={{ marginTop: 14, color: "#991b1b", fontWeight: "700" }}>{updateMe.error.message}</Text>
        )}

        <Pressable
          disabled={updateMe.isPending}
          onPress={() => updateMe.mutate({ firstName, lastName, phoneNumber })}
          style={({ pressed }) => ({
            marginTop: 18,
            backgroundColor: CTA_BG,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            opacity: updateMe.isPending ? 0.6 : pressed ? 0.9 : 1,
          })}
        >
          <Text style={{ color: "#ffffff", fontWeight: "900" }}>
            {updateMe.isPending ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => supabase.auth.signOut()}
          style={({ pressed }) => ({
            marginTop: 12,
            paddingVertical: 14,
            alignItems: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ color: "#991b1b", fontWeight: "900" }}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
