import { router } from "expo-router";
import { useState } from "react";
import { useToast } from "heroui-native";
import { useMutation } from "@tanstack/react-query";
import z from "zod";

import { AuthCta, AuthFieldRow, AuthFooterLink, AuthScreenShell } from "@/components/auth-flow-ui";
import { trpc } from "@/utils/trpc";

const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

export default function ForgotPasswordScreen() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const requestReset = useMutation(trpc.auth.forgotPassword.mutationOptions());

  async function handleSubmit() {
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.show({ variant: "danger", label: parsed.error.issues[0]?.message ?? "Invalid email" });
      return;
    }

    try {
      const result = await requestReset.mutateAsync({ email: parsed.data });
      if (result.rateLimited) {
        toast.show({
          variant: "warning",
          label: result.message,
        });
      }
      router.push({
        pathname: "/forgot-password-confirm",
        params: { email: parsed.data.toLowerCase() },
      });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: error instanceof Error ? error.message : "Could not send reset code",
      });
    }
  }

  return (
    <AuthScreenShell
      title="Forgot password"
      subtitle="Enter your email and we will send a 6-digit confirmation code"
      onBack={() => router.replace("/sign-in")}
      footer={
        <AuthFooterLink accent="Sign in" onPress={() => router.replace("/sign-in")}>
          Remember your password?
        </AuthFooterLink>
      }
    >
      <AuthFieldRow
        icon="mail-outline"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        textContentType="emailAddress"
        autoComplete="email"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <AuthCta
        label={requestReset.isPending ? "Sending..." : "Send confirmation code"}
        onPress={handleSubmit}
        disabled={requestReset.isPending}
      />
    </AuthScreenShell>
  );
}
