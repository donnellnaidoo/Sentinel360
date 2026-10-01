import { router } from "expo-router";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { useToast } from "heroui-native";
import { useMutation } from "@tanstack/react-query";
import z from "zod";

import { AuthCta, AuthFieldRow, AuthFooterLink, AuthMutedText, AuthScreenShell } from "@/components/auth-flow-ui";
import { clearPasswordResetDraft, getPasswordResetDraft } from "@/lib/password-flow-draft";
import { trpc } from "@/utils/trpc";

const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long");

export default function ResetPasswordScreen() {
  const { toast } = useToast();
  const draft = useMemo(() => getPasswordResetDraft(), []);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);

  const resetPassword = useMutation(trpc.auth.resetPassword.mutationOptions());

  async function handleSubmit() {
    if (!draft?.email || !/^\d{6}$/.test(draft.code)) {
      toast.show({ variant: "danger", label: "Reset session expired. Start again." });
      router.replace("/forgot-password");
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
      await resetPassword.mutateAsync({
        email: draft.email,
        code: draft.code,
        password: parsed.data,
      });
      clearPasswordResetDraft();
      setDone(true);
    } catch (error) {
      toast.show({
        variant: "danger",
        label: error instanceof Error ? error.message : "Could not reset password",
      });
    }
  }

  if (done) {
    return (
      <AuthScreenShell
        title="Password updated"
        subtitle="You can now sign in with your new password"
      >
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
      subtitle="Choose a new password and confirm it"
      onBack={() => router.back()}
      footer={
        <AuthFooterLink accent="Sign in" onPress={() => router.replace("/sign-in")}>
          Return to
        </AuthFooterLink>
      }
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
        label={resetPassword.isPending ? "Saving..." : "Update password"}
        onPress={handleSubmit}
        disabled={resetPassword.isPending}
      />
    </AuthScreenShell>
  );
}
