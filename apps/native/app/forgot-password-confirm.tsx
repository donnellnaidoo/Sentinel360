import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useToast } from "heroui-native";
import { useMutation } from "@tanstack/react-query";
import z from "zod";

import { AuthCta, AuthFieldRow, AuthFooterLink, AuthScreenShell } from "@/components/auth-flow-ui";
import { setPasswordResetDraft } from "@/lib/password-flow-draft";
import { trpc } from "@/utils/trpc";

const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");

export default function ForgotPasswordConfirmScreen() {
  const { toast } = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? "").trim().toLowerCase();
  const [code, setCode] = useState("");

  const verifyCode = useMutation(trpc.auth.verifyResetCode.mutationOptions());
  const resendCode = useMutation(trpc.auth.forgotPassword.mutationOptions());

  async function handleSubmit() {
    const parsed = codeSchema.safeParse(code);
    if (!email) {
      toast.show({ variant: "danger", label: "Missing email. Start the reset again." });
      router.replace("/forgot-password");
      return;
    }
    if (!parsed.success) {
      toast.show({ variant: "danger", label: parsed.error.issues[0]?.message ?? "Invalid code" });
      return;
    }

    try {
      await verifyCode.mutateAsync({ email, code: parsed.data });
      setPasswordResetDraft(email, parsed.data);
      router.push("/reset-password");
    } catch (error) {
      toast.show({
        variant: "danger",
        label: error instanceof Error ? error.message : "Invalid or expired code",
      });
    }
  }

  async function handleResend() {
    if (!email) return;
    try {
      const result = await resendCode.mutateAsync({ email });
      toast.show({
        variant: result.rateLimited ? "warning" : "success",
        label: result.rateLimited
          ? result.message
          : "A new code has been sent if the account exists.",
      });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: error instanceof Error ? error.message : "Could not resend code",
      });
    }
  }

  return (
    <AuthScreenShell
      title="Confirm code"
      subtitle={`Enter the 6-digit code sent to ${email || "your email"}`}
      onBack={() => router.back()}
      footer={
        <AuthFooterLink
          accent={resendCode.isPending ? "Sending..." : "Resend"}
          onPress={handleResend}
          disabled={resendCode.isPending}
        >
          Didn&apos;t get a code?
        </AuthFooterLink>
      }
    >
      <AuthFieldRow
        icon="key-outline"
        placeholder="6-digit code"
        value={code}
        onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        autoCapitalize="none"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
      />
      <AuthCta
        label={verifyCode.isPending ? "Confirming..." : "Confirm code"}
        onPress={handleSubmit}
        disabled={verifyCode.isPending}
      />
    </AuthScreenShell>
  );
}
