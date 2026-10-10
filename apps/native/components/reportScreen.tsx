import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, Platform, ScrollView, Text, TextInput, View, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useToast } from "heroui-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { File } from "expo-file-system";

import { AccountAvatarButton } from "@/lib/account-profile";
import { trpc } from "@/utils/trpc";
import { useAppTheme } from "@/contexts/app-theme-context";
import { useUserLocation } from "@/contexts/user-location-context";

const CTA_BG = "#0b2e4a";
const MAX_PHOTOS = 4;
const MIN_DESCRIPTION_LENGTH = 10;

type ReportPhoto = {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  fileSize?: number;
};

function generateReferenceCode() {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SIGHT-2026-${suffix}`;
}

export default function ReportScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { status: locationStatus, place, message: locationMessage, refresh: refreshLocation } = useUserLocation();
  const locationEdited = useRef(false);
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

  // Set when the reporter came from a wanted person's page. The reporter
  // only ever names a person — which case it goes to is decided by
  // moderators, and case details never reach this app.
  const params = useLocalSearchParams<{ profileId?: string }>();
  const [subjectId, setSubjectId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof params.profileId === "string" && params.profileId) {
      setSubjectId(params.profileId);
    }
  }, [params.profileId]);
  const subjectQuery = useQuery({
    ...trpc.profiles.getPublicWantedById.queryOptions({ id: subjectId ?? "" }),
    enabled: Boolean(subjectId),
  });
  const subject = subjectId ? subjectQuery.data : undefined;

  function clearSubject() {
    setSubjectId(null);
    router.setParams({ profileId: undefined });
  }

  const submitSighting = useMutation(
    trpc.sightings.submit.mutationOptions({
      onSuccess: () => {
        setDescription("");
        setLocationAddress("");
        setPhotos([]);
      },
    }),
  );

  useEffect(() => {
    if (!place || locationEdited.current) return;
    setLocationAddress(place.address);
  }, [place]);

  const trimmedDescription = description.trim();
  const canSubmit = trimmedDescription.length >= MIN_DESCRIPTION_LENGTH && !isSubmitting;

  async function applyCurrentLocation() {
    locationEdited.current = false;
    const nextPlace = await refreshLocation();
    if (nextPlace) {
      setLocationAddress(nextPlace.address);
    }
  }

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
      fileName: asset.fileName ?? `sighting-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileSize: asset.fileSize ?? undefined,
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

  async function photoToBase64(photo: ReportPhoto): Promise<string> {
    const file = new File(photo.uri);
    return await file.base64();
  }

  async function handleSubmit() {
    setError(null);

    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      setError(`Please enter at least ${MIN_DESCRIPTION_LENGTH} characters describing the sighting.`);
      return;
    }

    setIsSubmitting(true);

    try {

      const preparedPhotos = await Promise.all(
        photos.map(async (photo) => ({
          base64: await photoToBase64(photo),
          mimeType: photo.mimeType,
          originalFilename: photo.fileName,
          fileSize: photo.fileSize,
        })),
      );

      console.log("Prepared photos:", {
        count: preparedPhotos.length,
        photos: preparedPhotos.map((photo) => ({
          mimeType: photo.mimeType,
          originalFilename: photo.originalFilename,
          fileSize: photo.fileSize,
          base64Length: photo.base64.length,
        })),
      });

      const trimmedAddress = locationAddress.trim();
      const location =
        trimmedAddress || place
          ? {
              ...(trimmedAddress ? { address: trimmedAddress } : {}),
              ...(place ? { latitude: place.latitude, longitude: place.longitude } : {}),
            }
          : undefined;

      const created = await submitSighting.mutateAsync({
        sightingType: "COMMUNITY_REPORT",
        description: trimmedDescription,

        location,

        isAnonymous,

        photos: preparedPhotos,

        subjectEntityProfileId: subject?.id,
      });

      setReferenceCode(created.referenceCode);
      setIsSubmitted(true);
      clearSubject();

      toast.show({
        variant: "success",
        label: "Your report has been submitted",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";

        console.error("Sighting submission failed:", error);

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
    locationEdited.current = false;
    setLocationAddress(place?.address ?? "");
  }

  if (isSubmitted) {
    return (
      <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
        <View
          style={{
            height: 56,
            paddingHorizontal: 18,
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.sheetBg,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "900", color: colors.brand }}>Community Safety</Text>
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

            <Text style={{ marginTop: 18, fontSize: 24, fontWeight: "900", color: colors.text, textAlign: "center" }}>
              Report Submitted
            </Text>
            <Text style={{ marginTop: 10, color: colors.textMuted, textAlign: "center", lineHeight: 20, fontWeight: "600" }}>
              Your sighting report has been received and will be reviewed by community safety. Thank you for helping
              keep the neighborhood safe.
            </Text>

            <View
              style={{
                marginTop: 18,
                backgroundColor: colors.surface,
                borderRadius: 12,
                paddingVertical: 12,
                paddingHorizontal: 16,
                width: "100%",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: colors.textSubtle }}>REFERENCE CODE</Text>
              <Text style={{ marginTop: 4, fontSize: 18, fontWeight: "900", color: colors.brand }}>{referenceCode}</Text>
            </View>

            {photos.length > 0 && (
              <Text style={{ marginTop: 12, fontSize: 12, color: colors.textMuted, fontWeight: "700" }}>
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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      {/* Header (same style as Home) */}
      <View
        style={{
          height: 56,
          paddingHorizontal: 18,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.sheetBg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ flex: 1, fontSize: 20, fontWeight: "900", color: colors.brand }}>
          Community Safety
        </Text>

        <AccountAvatarButton />
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: Math.max(insets.bottom, 16) + 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={insets.bottom + 90}
        extraKeyboardSpace={20}
      >
        <Text style={{ fontSize: 26, fontWeight: "900", color: colors.text }}>Report Sighting</Text>
        <Text style={{ marginTop: 6, color: colors.textMuted, lineHeight: 18 }}>
          Your immediate report helps keep the community safe. All fields are confidential.
        </Text>

        {/* Wanted person this report is about */}
        {subjectId && (
          <View
            style={{
              marginTop: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingVertical: 12,
              paddingHorizontal: 14,
            }}
          >
            <Ionicons name="person-circle-outline" size={26} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textMuted }}>
                Reporting a sighting of
              </Text>
              {subjectQuery.isLoading ? (
                <ActivityIndicator style={{ alignSelf: "flex-start", marginTop: 4 }} color={colors.brand} />
              ) : subjectQuery.isError ? (
                <Text style={{ marginTop: 2, color: colors.textSubtle, lineHeight: 18 }}>
                  This person is no longer on the wanted list. Your report will be sent as a general sighting.
                </Text>
              ) : (
                <Text style={{ marginTop: 2, fontSize: 16, fontWeight: "800", color: colors.text }}>
                  {subject?.displayName ?? "Unnamed wanted person"}
                </Text>
              )}
            </View>
            <Pressable
              onPress={clearSubject}
              accessibilityRole="button"
              accessibilityLabel="Remove wanted person from this report"
              hitSlop={8}
              style={({ pressed }) => ({ padding: 4, opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Upload evidence */}
        <Pressable
          onPress={handleUploadPress}
          style={({ pressed }) => ({
            marginTop: 18,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            borderStyle: "dashed",
            backgroundColor: colors.surface,
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
                <Ionicons name="camera-outline" size={22} color={colors.brand} />
              </View>
              <Text style={{ marginTop: 12, fontWeight: "900", color: colors.text }}>Upload Evidence</Text>
              <Text style={{ marginTop: 4, fontSize: 12, color: colors.textSubtle }}>
                Tap to capture or select from gallery
              </Text>
            </>
          ) : (
            <View style={{ width: "100%", paddingHorizontal: 4 }}>
              <Text style={{ fontWeight: "900", color: colors.text, marginBottom: 10 }}>
                Attached Evidence ({photos.length}/{MAX_PHOTOS})
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {photos.map((photo) => (
                  <View key={photo.id} style={{ position: "relative" }}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: colors.chip }}
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
                      borderColor: colors.border,
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Ionicons name="add" size={22} color={colors.brand} />
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </Pressable>

        {/* Location */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: colors.text }}>Location</Text>
          <View
            style={{
              marginTop: 10,
              borderRadius: 14,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 12,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Ionicons name="location-sharp" size={16} color={colors.brand} />
            <TextInput
              value={locationAddress}
              onChangeText={(text) => {
                locationEdited.current = true;
                setLocationAddress(text);
              }}
              placeholder="Where did this happen? (e.g. Kingsway, Auckland Park)"
              placeholderTextColor={colors.textSubtle}
              editable={!isSubmitting}
              style={{ flex: 1, color: colors.text, fontWeight: "900", paddingVertical: 0 }}
            />
          </View>
          <Pressable
            onPress={() => void applyCurrentLocation()}
            disabled={isSubmitting || locationStatus === "loading"}
            style={({ pressed }) => ({
              marginTop: 8,
              alignSelf: "flex-start",
              opacity: pressed || locationStatus === "loading" ? 0.7 : 1,
            })}
          >
            <Text style={{ color: colors.brand, fontWeight: "800", fontSize: 12 }}>
              {locationStatus === "loading" ? "Finding your location…" : "Use current location"}
            </Text>
          </Pressable>
          {locationStatus === "denied" || locationStatus === "unavailable" ? (
            <Text style={{ marginTop: 6, color: colors.textSubtle, fontSize: 12, fontWeight: "600" }}>
              {locationMessage ?? "You can still type an address."}
            </Text>
          ) : null}
        </View>

        {/* Sighting description */}
        <View style={{ marginTop: 18 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: colors.text }}>Sighting Description</Text>
          <View
            style={{
              marginTop: 10,
              borderRadius: 14,
              backgroundColor: colors.surfaceMuted,
              borderWidth: 1,
              borderColor: error ? "rgba(153, 27, 27, 0.35)" : colors.border,
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
              placeholderTextColor={colors.textSubtle}
              multiline
              editable={!isSubmitting}
              style={{
                color: colors.text,
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
          <Text style={{ marginTop: 8, fontSize: 11, color: colors.textSubtle, fontWeight: "700" }}>
            {trimmedDescription.length}/{MIN_DESCRIPTION_LENGTH} minimum characters
          </Text>
        </View>

        {/* Anonymous toggle */}
        <Pressable
          onPress={() => setIsAnonymous((v) => !v)}
          style={({ pressed }) => ({
            marginTop: 18,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 10,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons
            name={isAnonymous ? "checkbox" : "square-outline"}
            size={20}
            color={colors.brand}
            style={{ marginTop: 1 }}
          />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="lock-closed" size={13} color={colors.textMuted} />
              <Text style={{ color: colors.text, fontWeight: "700" }}>Submit anonymously</Text>
            </View>
            <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSubtle, lineHeight: 16 }}>
              Your name stays hidden from other users — only safety moderators can see who reported this.
            </Text>
          </View>
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
        //     backgroundColor: colors.brand,
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

