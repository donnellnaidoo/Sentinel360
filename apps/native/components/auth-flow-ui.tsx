import { Ionicons } from "@expo/vector-icons";
import type { ReactNode, RefObject } from "react";
import { Pressable, StatusBar, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppTheme } from "@/contexts/app-theme-context";

export const HERO_BG = "#0b1f22";
export const HERO_ACCENT = "#0e6d7a";
export const CTA_BG = "#0b2e4a";

export function AuthFieldRow({
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
  autoComplete,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  textContentType?:
    | "emailAddress"
    | "password"
    | "newPassword"
    | "oneTimeCode"
    | "none";
  autoComplete?: "email" | "password" | "new-password" | "one-time-code" | "off";
  returnKeyType?: "next" | "go" | "done";
  inputRef?: RefObject<TextInput | null>;
  onSubmitEditing?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.fieldBg,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <Ionicons name={icon} size={18} color={colors.iconMuted} />
      <TextInput
        ref={inputRef as never}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSubtle}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        textContentType={textContentType}
        autoComplete={autoComplete}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={{
          flex: 1,
          marginLeft: 10,
          color: colors.text,
          fontWeight: "600",
          paddingVertical: 0,
        }}
      />
    </View>
  );
}

export function AuthCta({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        marginTop: 10,
        backgroundColor: colors.cta,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        opacity: disabled ? 0.6 : pressed ? 0.92 : 1,
      })}
    >
      <Text style={{ color: "#fff", fontWeight: "900" }}>{label}</Text>
    </Pressable>
  );
}

export function AuthMutedText({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <Text style={{ color: colors.textMuted, fontWeight: "600", fontSize: 13, textAlign: "center" }}>
      {children}
    </Text>
  );
}

export function AuthFooterLink({
  children,
  accent,
  onPress,
  disabled,
}: {
  children: ReactNode;
  accent: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      <Text style={{ textAlign: "center", color: colors.text, fontWeight: "700" }}>
        {children} <Text style={{ color: colors.heroAccent }}>{accent}</Text>
      </Text>
    </Pressable>
  );
}

export function AuthScreenShell({
  title,
  subtitle,
  children,
  footer,
  onBack,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.sheetBg }}>
      <StatusBar barStyle={colors.statusBar} backgroundColor={colors.sheetBg} />
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginBottom: 8,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={20} color={colors.heroAccent} />
            <Text style={{ color: colors.heroAccent, fontWeight: "800" }}>Back</Text>
          </Pressable>
        ) : null}

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
            <Text style={{ color: colors.heroAccent, fontWeight: "900", fontSize: 18 }}>S</Text>
          </View>
          <Text style={{ marginTop: 12, fontSize: 28, fontWeight: "800", color: colors.text }}>{title}</Text>
          <Text style={{ marginTop: 4, fontSize: 13, color: colors.textMuted, textAlign: "center" }}>{subtitle}</Text>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 18,
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 10 },
            elevation: 4,
            gap: 12,
          }}
        >
          {children}
        </View>

        {footer ? <View style={{ marginTop: 16 }}>{footer}</View> : null}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
