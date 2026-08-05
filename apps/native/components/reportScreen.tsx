import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Platform, ScrollView, Text, TextInput, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useToast } from "heroui-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

import { trpc } from "@/utils/trpc";

const SHEET_BG = "#ffffff";
const BRAND_BLUE = "#1e3a8a";
const CTA_BG = "#0b2e4a";
const MAX_PHOTOS = 4;
const MIN_DESCRIPTION_LENGTH = 10;

type ReportPhoto = {
  id: string;
  uri: string;
};

function generateReferenceCode() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SIGHT-2026-${suffix}`;
}

export default function ReportScreen() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [referenceCode, setReferenceCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitSighting = useMutation(
    trpc.sightings.submit.mutationOptions({
      onSuccess: () => {
        setDescription("");
        setLocationAddress("");
      },
    }),
  );

  const trimmedDescription = description.trim();
  const canSubmit = trimmedDescription.length > 0 && !submitSighting.isPending;

  async function ensureLibraryPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      toast.show({
        variant: "danger",
        label: "Photo library permission is required to attach evidence.",
      });
      return false;
    }
    return true;
  }

  async function ensureCameraPermission() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      toast.show({
        variant: "danger",
        label: "Camera permission is required to capture evidence.",
      });
      return false;
    }
    return true;
  }

  function addPhotos(assets: ImagePicker.ImagePickerAsset[]) {
    if (!assets.length) return;

    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.show({
        variant: "warning",
        label: `You can attach up to ${MAX_PHOTOS} photos per report.`,
      });
      return;
    }

    const nextPhotos = assets.slice(0, remaining).map((asset, index) => ({
      id: `${asset.assetId ?? asset.uri}-${Date.now()}-${index}`,
      uri: asset.uri,
    }));

    setPhotos((current) => [...current, ...nextPhotos]);

    if (assets.length > remaining) {
      toast.show({
        variant: "warning",
        label: `Only ${remaining} more photo${remaining === 1 ? "" : "s"} could be added.`,
      });
    }
  }

  async function pickFromGallery() {
    if (photos.length >= MAX_PHOTOS) {
      toast.show({
        variant: "warning",
        label: `Maximum of ${MAX_PHOTOS} photos reached.`,
      });
      return;
    }

    const allowed = await ensureLibraryPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.8,
    });

    if (!result.canceled) {
      addPhotos(result.assets);
    }
  }

  async function capturePhoto() {
    if (photos.length >= MAX_PHOTOS) {
      toast.show({
        variant: "warning",
        label: `Maximum of ${MAX_PHOTOS} photos reached.`,
      });
      return;
    }

    const allowed = await ensureCameraPermission();
    if (!allowed) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      addPhotos(result.assets);
    }
  }

  function handleUploadPress() {
    if (Platform.OS === "web") {
      void pickFromGallery();
      return;
    }

    Alert.alert("Upload Evidence", "Choose how you want to add a photo", [
      { text: "Take Photo", onPress: () => void capturePhoto() },
      { text: "Choose from Gallery", onPress: () => void pickFromGallery() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function removePhoto(id: string) {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }

  async function handleSubmit() {
    setError(null);

    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      setError(`Please enter at least ${MIN_DESCRIPTION_LENGTH} characters describing the sighting.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to submit a report.");
      }

      const ref = generateReferenceCode();

      const { error: insertError } = await supabase.from("Sighting").insert({
        description: trimmedDescription,
        reference_code: ref,
        created_by: user.id,
      });

      if (insertError) {
        throw insertError;
      }

      setReferenceCode(ref);
      setIsSubmitted(true);

      toast.show({
        variant: "success",
        label: "Your report has been submitted.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

      setError(message);
      toast.show({
        variant: "danger",
        label: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmitAnother() {
    setDescription("");
    setPhotos([]);
    setReferenceCode("");
    setError(null);
    setIsSubmitted(false);
  }

  if (isSubmitted) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: SHEET_BG }}>
        <View
          style={{
            height: 56,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: SHEET_BG,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(15, 23, 42, 0.06)",
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "900", color: BRAND_BLUE }}>Community Safety</Text>
        </View>

        <View style={{ flex: 1, paddingHorizontal: 18, justifyContent: "center", paddingBottom: 40 }}>
          <View
            style={{
              backgroundColor: "#ecfdf5",
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: "rgba(22, 163, 74, 0.15)",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                backgroundColor: "#16a34a",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="checkmark" size={34} color="#ffffff" />
            </View>

            <Text style={{ marginTop: 18, fontSize: 24, fontWeight: "900", color: "#0f172a", textAlign: "center" }}>
              Report Submitted
            </Text>
            <Text style={{ marginTop: 10, color: "#64748b", textAlign: "center", lineHeight: 20, fontWeight: "600" }}>
              Your sighting report has been received and will be reviewed by community safety. Thank you for helping
              keep the neighborhood safe.
            </Text>

            <View
              style={{
                marginTop: 18,
                backgroundColor: "#ffffff",
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#94a3b8" }}>REFERENCE CODE</Text>
              <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: BRAND_BLUE }}>{referenceCode}</Text>
            </View>

            {photos.length > 0 && (
              <Text style={{ marginTop: 12, fontSize: 12, color: "#64748b", fontWeight: "700" }}>
                {photos.length} photo{photos.length === 1 ? "" : "s"} attached
              </Text>
            )}
          </View>

          <Pressable
            onPress={handleSubmitAnother}
            style={({ pressed }) => ({
              marginTop: 20,
              backgroundColor: CTA_BG,
              paddingVertical: 14,
              borderRadius: 14,
              alignItems: "center",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ fontWeight: "900", color: "#ffffff" }}>Submit Another Report</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

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

        <Pressable
          onPress={() => router.push("/(drawer)/(tabs)/profile")}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 999,
            overflow: "hidden",
            backgroundColor: "#e2e8f0",
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=128&h=128&q=60",
            }}
            style={{ width: 40, height: 40 }}
          />
        </Pressable>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 16) + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={insets.bottom + 90}
        extraKeyboardSpace={20}
      >
        <Text style={{ fontSize: 26, fontWeight: "900", color: "#0f172a" }}>Report Sighting</Text>
        <Text style={{ marginTop: 6, color: "#64748b", lineHeight: 18 }}>
          Your immediate report helps keep the community safe. All fields are confidential.
        </Text>

        {/* Upload evidence */}
        <Pressable
          onPress={handleUploadPress}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(15, 23, 42, 0.15)",
            borderStyle: "dashed",
            backgroundColor: "#ffffff",
            paddingVertical: photos.length > 0 ? 16 : 26,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.92 : 1,
          })}
        >
          {photos.length === 0 ? (
            <>
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
            </>
          ) : (
            <View style={{ width: "100%", paddingHorizontal: 4 }}>
              <Text style={{ fontWeight: "900", color: "#0f172a", marginBottom: 10 }}>
                Attached Evidence ({photos.length}/{MAX_PHOTOS})
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {photos.map((photo) => (
                  <View key={photo.id} style={{ position: "relative" }}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: "#e2e8f0" }}
                    />
                    <Pressable
                      onPress={() => removePhoto(photo.id)}
                      style={({ pressed }) => ({
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        backgroundColor: "#991b1b",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Ionicons name="close" size={14} color="#ffffff" />
                    </Pressable>
                  </View>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <Pressable
                    onPress={handleUploadPress}
                    style={({ pressed }) => ({
                      width: 72,
                      height: 72,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "rgba(15, 23, 42, 0.15)",
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Ionicons name="add" size={22} color={BRAND_BLUE} />
                  </Pressable>
                )}
              </View>
            </View>
          )}
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
              placeholder="Where did this happen? (e.g. Kingsway, Auckland Park)"
              placeholderTextColor="#94a3b8"
              style={{ flex: 1, color: "#0f172a", fontWeight: "900", paddingVertical: 0 }}
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
              borderColor: error ? "rgba(153, 27, 27, 0.35)" : "rgba(15, 23, 42, 0.08)",
              padding: 12,
              minHeight: 120,
            }}
          >
            <TextInput
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (error) setError(null);
              }}
              placeholder="Provide details about the individual, clothing, or behavior observed..."
              placeholderTextColor="#94a3b8"
              multiline
              editable={!isSubmitting}
              style={{
                color: "#0f172a",
                fontWeight: "600",
                lineHeight: 18,
                paddingVertical: 0,
                minHeight: 96,
                textAlignVertical: "top",
              }}
            />
          </View>
          {!!error && (
            <Text style={{ marginTop: 8, color: "#991b1b", fontWeight: "700", fontSize: 12 }}>{error}</Text>
          )}
          <Text style={{ marginTop: 8, fontSize: 11, color: "#94a3b8", fontWeight: "700" }}>
            {trimmedDescription.length}/{MIN_DESCRIPTION_LENGTH} minimum characters
          </Text>
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
        //   disabled={!canSubmit}
        //   onPress={() =>
        //     submitSighting.mutate({
        //       description,
        //       location: locationAddress ? { address: locationAddress } : undefined,
        //       isAnonymous,
        //     })
        //   }
        //   style={({ pressed }) => ({
        //     marginTop: 18,
        //     backgroundColor: BRAND_BLUE,
        //     borderRadius: 14,
        //     paddingVertical: 16,
        //     alignItems: "center",
        //     justifyContent: "center",
        //     flexDirection: "row",
        //     gap: 8,
        //     opacity: !canSubmit ? 0.5 : pressed ? 0.9 : 1,
        //   })}
        // >
        //   {submitSighting.isPending && <ActivityIndicator color="#ffffff" />}
        //   <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 16 }}>
        //     {submitSighting.isPending ? "Submitting..." : "Submit Report"}
        //   </Text>
          onPress={() => void handleSubmit()}
          disabled={!canSubmit}
          style={({ pressed }) => ({
            marginTop: 24,
            backgroundColor: canSubmit ? CTA_BG : "#cbd5e1",
            paddingVertical: 14,
            borderRadius: 14,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 8,
            opacity: pressed && canSubmit ? 0.92 : 1,
          })}
        >
          {isSubmitting ? (
            <>
              <ActivityIndicator color="#ffffff" />
              <Text style={{ fontWeight: "900", color: "#ffffff" }}>Submitting...</Text>
            </>
          ) : (
            <>
              <Ionicons name="paper-plane" size={18} color="#ffffff" />
              <Text style={{ fontWeight: "900", color: "#ffffff" }}>Submit Report</Text>
            </>
          )}
        </Pressable>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

