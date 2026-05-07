import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StatusBar, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "heroui-native";
import { useForm } from "@tanstack/react-form";
import z from "zod";

type AuthMode = "sign-in" | "sign-up";

// Palette aligned with onboarding (`components/OnBoarding.tsx`)
const HERO_BG = "#0b1f22";
const HERO_ACCENT = "#0e6d7a";
const SHEET_BG = "#ffffff";
const CTA_BG = "#0b2e4a";

// Demo-only credentials (no backend)
const DEMO_EMAIL = "demo@sentinel360.com";
const DEMO_PASSWORD = "Password123!";

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});

function getErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;

  if (Array.isArray(error)) {
    for (const issue of error) {
      const message = getErrorMessage(issue);
      if (message) return message;
    }
    return null;
  }

  if (typeof error === "object" && error !== null) {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string") return maybeError.message;
  }

  return null;
}

function SegmentedTab({
  mode,
  onModeChange,
}: {
  mode: AuthMode;
  onModeChange: (next: AuthMode) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#eef2f7",
        borderRadius: 14,
        padding: 4,
        marginTop: 18,
        marginBottom: 18,
      }}
    >
      {(["sign-in", "sign-up"] as const).map((key) => {
        const active = key === mode;
        return (
          <Pressable
            key={key}
            onPress={() => onModeChange(key)}
            style={({ pressed }) => ({
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: active ? HERO_ACCENT : "transparent",
              opacity: pressed ? 0.92 : 1,
            })}
          >
            <Text style={{ color: active ? "#fff" : "#64748b", fontWeight: "700" }}>
              {key === "sign-in" ? "Login" : "Register"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldRow({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  textContentType,
  returnKeyType,
  inputRef,
  onSubmitEditing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  textContentType?: "name" | "emailAddress" | "password" | "newPassword" | "none";
  returnKeyType?: "next" | "go" | "done";
  inputRef?: React.RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f1f5f9",
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Ionicons name={icon} size={18} color="#94a3b8" />
      <TextInput
        ref={inputRef as never}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={{
          flex: 1,
          marginLeft: 10,
          color: "#0f172a",
          fontWeight: "600",
          paddingVertical: 0,
        }}
      />
    </View>
  );
}

export default function AuthScreen({ mode: initialMode }: { mode: AuthMode }) {
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [rememberMe, setRememberMe] = useState(true);

  const nameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const form = useForm({
    defaultValues: useMemo(
      () => ({
        name: "",
        email: "",
        password: "",
      }),
      [],
    ),
    validators: {
      onSubmit: ({ value }) => {
        const result =
          mode === "sign-in"
            ? signInSchema.safeParse({ email: value.email, password: value.password })
            : signUpSchema.safeParse(value);

        if (result.success) return undefined;

        // React Form accepts a string as a submit error; keep it simple.
        return result.error.issues[0]?.message ?? "Invalid input";
      },
    },
    onSubmit: async ({ value, formApi }) => {
      if (mode === "sign-in") {
        const email = value.email.trim().toLowerCase();
        const password = value.password;

        if (email !== DEMO_EMAIL || password !== DEMO_PASSWORD) {
          toast.show({
            variant: "danger",
            label: `Use demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
          });
          return;
        }

        formApi.reset();
        toast.show({ variant: "success", label: "Signed in (demo) successfully" });
        router.replace("/(drawer)/(tabs)");
        return;
      }

      // Demo sign-up: accept and continue (no backend)
      formApi.reset();
      toast.show({ variant: "success", label: "Account created (demo) successfully" });
      router.replace("/(drawer)/(tabs)");
    },
  });

  const onModeChange = (next: AuthMode) => {
    setMode(next);
    router.replace(next === "sign-in" ? "/sign-in" : "/sign-up");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: SHEET_BG }}>
      <StatusBar barStyle="dark-content" backgroundColor={SHEET_BG} />

      <View style={{ flex: 1, paddingHorizontal: 18, paddingTop: 14 }}>
        <View style={{ alignItems: "center", paddingTop: 6, paddingBottom: 10 }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: "rgba(14,109,122,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: HERO_ACCENT, fontWeight: "900", fontSize: 18 }}>S</Text>
          </View>

          <Text style={{ marginTop: 12, fontSize: 28, fontWeight: "800", color: HERO_BG }}>
            {mode === "sign-in" ? "Login" : "Register"}
          </Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>
            {mode === "sign-in" ? "Welcome back" : "Create your account to continue"}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 16,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
          }}
        >
          <SegmentedTab mode={mode} onModeChange={onModeChange} />

          <form.Subscribe
            selector={(state) => ({
              isSubmitting: state.isSubmitting,
              submitError: getErrorMessage(state.errorMap.onSubmit),
            })}
          >
            {({ isSubmitting, submitError }) => (
              <View style={{ gap: 12 }}>
                {!!submitError && (
                  <Text style={{ color: "#ef4444", fontWeight: "700", fontSize: 12 }}>
                    {submitError}
                  </Text>
                )}

                {mode === "sign-up" && (
                  <form.Field name="name">
                    {(field) => (
                      <FieldRow
                        icon="person-outline"
                        placeholder="Full name"
                        value={field.state.value}
                        onChangeText={field.handleChange}
                        inputRef={nameRef}
                        returnKeyType="next"
                        textContentType="name"
                        autoCapitalize="words"
                        onSubmitEditing={() => emailRef.current?.focus()}
                      />
                    )}
                  </form.Field>
                )}

                <form.Field name="email">
                  {(field) => (
                    <FieldRow
                      icon="mail-outline"
                      placeholder="Email"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      textContentType="emailAddress"
                      inputRef={emailRef}
                      returnKeyType="next"
                      onSubmitEditing={() => passwordRef.current?.focus()}
                    />
                  )}
                </form.Field>

                <form.Field name="password">
                  {(field) => (
                    <FieldRow
                      icon="lock-closed-outline"
                      placeholder="Password"
                      value={field.state.value}
                      onChangeText={field.handleChange}
                      secureTextEntry
                      textContentType={mode === "sign-in" ? "password" : "newPassword"}
                      inputRef={passwordRef}
                      returnKeyType="go"
                      onSubmitEditing={form.handleSubmit}
                    />
                  )}
                </form.Field>

                {mode === "sign-in" && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: 2,
                    }}
                  >
                    <Pressable
                      onPress={() => setRememberMe((v) => !v)}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        opacity: pressed ? 0.9 : 1,
                      })}
                    >
                      <Ionicons
                        name={rememberMe ? "checkbox-outline" : "square-outline"}
                        size={18}
                        color={HERO_ACCENT}
                      />
                      <Text style={{ marginLeft: 8, color: "#64748b", fontWeight: "600" }}>
                        Remember me
                      </Text>
                    </Pressable>

                    <Pressable onPress={() => toast.show({ variant: "default", label: "Coming soon" })}>
                      <Text style={{ color: HERO_ACCENT, fontWeight: "800" }}>Forgot password?</Text>
                    </Pressable>
                  </View>
                )}

                <Pressable
                  onPress={form.handleSubmit}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    marginTop: 10,
                    backgroundColor: CTA_BG,
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: "center",
                    opacity: isSubmitting ? 0.6 : pressed ? 0.92 : 1,
                  })}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>
                    {mode === "sign-in" ? "Login" : "Register"}
                  </Text>
                </Pressable>

                <View style={{ marginTop: 16, flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                  <Text style={{ marginHorizontal: 10, color: "#94a3b8", fontWeight: "700" }}>Or</Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: "#e2e8f0" }} />
                </View>

                <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                  <Pressable
                    onPress={() => toast.show({ variant: "default", label: "Facebook coming soon" })}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: HERO_BG,
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={{ color: "#fff", fontWeight: "900" }}>Facebook</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => toast.show({ variant: "default", label: "Google coming soon" })}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: "#f8fafc",
                      borderWidth: 1,
                      borderColor: "#e2e8f0",
                      paddingVertical: 12,
                      borderRadius: 14,
                      alignItems: "center",
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={{ color: HERO_BG, fontWeight: "900" }}>Google</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </form.Subscribe>
        </View>

        <View style={{ marginTop: 16 }}>
          {mode === "sign-in" ? (
            <Link href="/sign-up" asChild>
              <Text style={{ textAlign: "center", color: "#0f172a", fontWeight: "700" }}>
                Don&apos;t have an account? <Text style={{ color: HERO_ACCENT }}>Register</Text>
              </Text>
            </Link>
          ) : (
            <Link href="/sign-in" asChild>
              <Text style={{ textAlign: "center", color: "#0f172a", fontWeight: "700" }}>
                Already have an account? <Text style={{ color: HERO_ACCENT }}>Login</Text>
              </Text>
            </Link>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

