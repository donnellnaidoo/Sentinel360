import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useToast } from "heroui-native";
import { useMutation } from "@tanstack/react-query";
import z from "zod";

import { AuthCta, AuthFieldRow, AuthMutedText, AuthScreenShell } from "@/components/auth-flow-ui";
import { supabase } from "@/lib/auth-client";
import { clearCurrentPasswordDraft, getCurrentPasswordDraft } from "@/lib/password-flow-draft";
import { queryClient, trpc } from "@/utils/trpc";

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long");

export default function ChangePasswordNewScreen() {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const changePassword = useMutation(trpc.auth.changePassword.mutationOptions());

  async function handleSubmit() {
    const currentPassword = getCurrentPasswordDraft();
    if (!currentPassword) {
      toast.show({ variant: "danger", label: "Confirm your current password first." });
      router.replace("/change-password");
      return;
    }

    const parsed = passwordSchema.safeParse(password);
    if (!parsed.success) {
      toast.show({ variant: "danger", label: parsed.error.issues[0]?.message ?? "Invalid password" });
      return;
    }
    if (password !== confirmPassword) {
      toast.show({ variant: "danger", label: "Passwords do not match" });
      return;
    }

    try {
      await changePassword.mutateAsync({
        currentPassword,
        newPassword: parsed.data,
      });
      await supabase.auth.signOut();
      queryClient.clear();
      clearCurrentPasswordDraft();
      setDone(true);
    } catch (error) {
      toast.show({
        variant: "danger",
        label: error instanceof Error ? error.message : "Could not update password",
      });
    }
  }

  if (done) {
    return (
      <AuthScreenShell title="Password updated" subtitle="Sign in again with your new password">
        <View style={{ paddingVertical: 8 }}>
          <AuthMutedText>Your password was changed successfully.</AuthMutedText>
        </View>
        <AuthCta label="Back to sign in" onPress={() => router.replace("/sign-in")} />
      </AuthScreenShell>
    );
  }

  return (
    <AuthScreenShell
      title="New password"
      subtitle="Enter a new password and confirm it"
      onBack={() => router.back()}
    >
      <AuthFieldRow
        icon="lock-closed-outline"
        placeholder="New password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="next"
      />
      <AuthFieldRow
        icon="lock-closed-outline"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        textContentType="newPassword"
        autoComplete="new-password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <AuthCta
        label={changePassword.isPending ? "Saving..." : "Update password"}
        onPress={handleSubmit}
        disabled={changePassword.isPending}
      />
    </AuthScreenShell>
  );
}
