import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { useEffect, useState } from "react";
import { Alert, Image, Platform, Pressable, Text, View } from "react-native";

import { AuthCta, AuthFieldRow } from "@/components/auth-flow-ui";
import { SettingsDetailScreen, SettingsInfoCard } from "@/components/settings-detail-screen";
import { useAccountProfile } from "@/lib/account-profile";
import { supabase } from "@/lib/auth-client";
import { queryClient, trpc } from "@/utils/trpc";

type PendingPhoto = {
  uri: string;
  fileName: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

function normalizeMime(mime?: string | null): PendingPhoto["mimeType"] | null {
  if (!mime || mime === "image/jpg" || mime === "image/jpeg") return "image/jpeg";
  if (mime === "image/png") return "image/png";
  if (mime === "image/webp") return "image/webp";
  return null;
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { profile: data, image: savedImage, name: accountName, email } = useAccountProfile();
  const [name, setName] = useState(accountName === "Community Member" ? "" : accountName);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data || hydrated) return;
    setName(data.name ?? "");
    setFirstName(data.firstName ?? "");
    setLastName(data.lastName ?? "");
    setPhoneNumber(data.phoneNumber ?? "");
    setHydrated(true);
  }, [data, hydrated]);

  const updateMe = useMutation(trpc.users.updateMe.mutationOptions());

  const previewUri = pendingPhoto?.uri || savedImage || null;
  const initials = (name || data?.name || "S")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  async function ensureLibraryPermission() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      toast.show({ variant: "danger", label: "Photo library permission is required to set a profile picture." });
      return false;
    }
    return true;
  }

  async function ensureCameraPermission() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== ImagePicker.PermissionStatus.GRANTED) {
      toast.show({ variant: "danger", label: "Camera permission is required to take a profile picture." });
      return false;
    }
    return true;
  }

  function applyAsset(asset: ImagePicker.ImagePickerAsset) {
    const mimeType = normalizeMime(asset.mimeType);
    if (!mimeType) {
      toast.show({ variant: "danger", label: "Use a JPEG, PNG, or WebP photo." });
      return;
    }
    setPendingPhoto({
      uri: asset.uri,
      fileName: asset.fileName ?? `avatar.${mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg"}`,
      mimeType,
    });
  }

  async function pickFromGallery() {
    const allowed = await ensureLibraryPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) applyAsset(result.assets[0]);
  }

  async function capturePhoto() {
    const allowed = await ensureCameraPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) applyAsset(result.assets[0]);
  }

  function handleChangePhoto() {
    if (Platform.OS === "web") {
      void pickFromGallery();
      return;
    }
    Alert.alert("Profile picture", "Choose a photo for your account", [
      { text: "Take Photo", onPress: () => void capturePhoto() },
      { text: "Choose from Gallery", onPress: () => void pickFromGallery() },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function handleSave() {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast.show({ variant: "danger", label: "Name must be at least 2 characters." });
      return;
    }

    setSaving(true);
    try {
      let photo: { fileBase64: string; originalFilename: string; mimeType: PendingPhoto["mimeType"] } | undefined;
      if (pendingPhoto) {
        const file = new File(pendingPhoto.uri);
        photo = {
          fileBase64: await file.base64(),
          originalFilename: pendingPhoto.fileName,
          mimeType: pendingPhoto.mimeType,
        };
      }

      const updated = await updateMe.mutateAsync({
        name: trimmedName,
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        phoneNumber: phoneNumber.trim(),
        ...(photo ? { photo } : {}),
      });

      queryClient.setQueryData(trpc.users.me.queryKey(), updated);
      await queryClient.invalidateQueries({ queryKey: trpc.users.me.queryKey() });
      await supabase.auth.refreshSession();
      toast.show({ variant: "success", label: "Profile updated" });
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not update your profile.";
      toast.show({ variant: "danger", label: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsDetailScreen
      title="Edit Profile"
      subtitle="Your name, photo, and phone are stored on your Sentinel360 account."
      icon="person-outline"
    >
      <>
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <Pressable
              onPress={handleChangePhoto}
              accessibilityRole="button"
              accessibilityLabel="Change profile picture"
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <View
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 999,
                  overflow: "hidden",
                  backgroundColor: "#0b2e4a",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {previewUri ? (
                  <Image source={{ uri: previewUri }} style={{ width: 112, height: 112 }} />
                ) : (
                  <Text style={{ color: "#ffffff", fontSize: 32, fontWeight: "900" }}>{initials}</Text>
                )}
              </View>
              <View
                style={{
                  position: "absolute",
                  right: 0,
                  bottom: 0,
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  backgroundColor: "#0e6d7a",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: "#ffffff",
                }}
              >
                <Ionicons name="camera" size={16} color="#ffffff" />
              </View>
            </Pressable>
            <Text style={{ marginTop: 10, fontWeight: "800", color: "#0e6d7a" }}>
              {pendingPhoto ? "New photo ready to save" : "Change profile picture"}
            </Text>
          </View>

          <SettingsInfoCard
            title="Profile picture"
            body="Tap the photo to take a new one or choose from your library. JPEG, PNG, and WebP files up to 5 MB are saved to your account."
          />

          <View style={{ gap: 12 }}>
            <AuthFieldRow
              icon="person-outline"
              placeholder="Display name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <AuthFieldRow
              icon="text-outline"
              placeholder="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <AuthFieldRow
              icon="text-outline"
              placeholder="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              returnKeyType="next"
            />
            <AuthFieldRow
              icon="call-outline"
              placeholder="Phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              returnKeyType="done"
            />
          </View>
          <SettingsInfoCard
            title="Email"
            body={email ? `${email} — this is the address you sign in with.` : "Your sign-in email is not available right now."}
          />
          <AuthCta
            label={saving ? "Saving…" : "Save profile"}
            onPress={() => void handleSave()}
            disabled={saving}
          />
      </>
    </SettingsDetailScreen>
  );
}
