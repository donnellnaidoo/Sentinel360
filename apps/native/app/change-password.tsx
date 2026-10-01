import { router } from "expo-router";
import { useState } from "react";
import { useToast } from "heroui-native";

import { AuthCta, AuthFieldRow, AuthMutedText, AuthScreenShell } from "@/components/auth-flow-ui";
import { setCurrentPasswordDraft } from "@/lib/password-flow-draft";

export default function ChangePasswordConfirmScreen() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");

  function handleContinue() {
    if (!currentPassword.trim()) {
      toast.show({ variant: "danger", label: "Enter your current password" });
      return;
    }

    setCurrentPasswordDraft(currentPassword);
    router.push("/change-password-new");
  }

  return (
    <AuthScreenShell
      title="Confirm password"
      subtitle="Enter your current password to continue"
      onBack={() => router.back()}
    >
      <AuthMutedText>
        For your security, confirm the password you use to sign in.
      </AuthMutedText>
      <AuthFieldRow
        icon="lock-closed-outline"
        placeholder="Current password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
        textContentType="password"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={handleContinue}
      />
      <AuthCta label="Continue" onPress={handleContinue} />
    </AuthScreenShell>
  );
}
