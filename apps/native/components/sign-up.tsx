import { useForm } from "@tanstack/react-form";
import {
  Button,
  Checkbox,
  FieldError,
  Input,
  Label,
  Spinner,
  Surface,
  TextField,
  useToast,
} from "heroui-native";
import { useRef } from "react";
import { Text, TextInput, View } from "react-native";
import z from "zod";

import { supabase } from "@/lib/auth-client";
import { queryClient } from "@/utils/trpc";

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
  // POPIA s11: registration requires explicit, affirmative consent.
  popiaConsent: z.literal(true, {
    error: "You must accept the privacy policy to create an account",
  }),
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

export function SignUp() {
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      popiaConsent: false,
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const { error } = await supabase.auth.signUp({
        email: value.email.trim(),
        password: value.password,
        options: {
          data: { name: value.name.trim(), popiaConsentAt: new Date().toISOString() },
        },
      });

      if (error) {
        toast.show({ variant: "danger", label: error.message || "Failed to sign up" });
        return;
      }

      formApi.reset();
      toast.show({ variant: "success", label: "Account created successfully" });
      queryClient.refetchQueries();
    },
  });

  return (
    <Surface variant="secondary" className="p-4 rounded-lg">
      <Text className="text-foreground font-medium mb-4">Create Account</Text>

      <form.Subscribe
        selector={(state) => ({
          isSubmitting: state.isSubmitting,
          validationError: getErrorMessage(state.errorMap.onSubmit),
        })}
      >
        {({ isSubmitting, validationError }) => (
          <>
            <FieldError isInvalid={!!validationError} className="mb-3">
              {validationError}
            </FieldError>

            <View className="gap-3">
              <form.Field name="name">
                {(field) => (
                  <TextField>
                    <Label>Name</Label>
                    <Input
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="John Doe"
                      autoComplete="name"
                      textContentType="name"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => emailInputRef.current?.focus()}
                    />
                  </TextField>
                )}
              </form.Field>

              <form.Field name="email">
                {(field) => (
                  <TextField>
                    <Label>Email</Label>
                    <Input
                      ref={emailInputRef}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="email@example.com"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                      textContentType="emailAddress"
                      returnKeyType="next"
                      blurOnSubmit={false}
                      onSubmitEditing={() => passwordInputRef.current?.focus()}
                    />
                  </TextField>
                )}
              </form.Field>

              <form.Field name="password">
                {(field) => (
                  <TextField>
                    <Label>Password</Label>
                    <Input
                      ref={passwordInputRef}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChangeText={field.handleChange}
                      placeholder="••••••••"
                      secureTextEntry
                      autoComplete="new-password"
                      textContentType="newPassword"
                      returnKeyType="go"
                      onSubmitEditing={form.handleSubmit}
                    />
                  </TextField>
                )}
              </form.Field>

              <form.Field name="popiaConsent">
                {(field) => (
                  <View className="flex-row items-start gap-2 mt-1">
                    <Checkbox
                      isSelected={field.state.value}
                      onSelectedChange={field.handleChange}
                    />
                    <Text className="flex-1 text-foreground/70 text-xs">
                      I consent to Sentinel360 processing my personal information in
                      accordance with the Protection of Personal Information Act (POPIA).
                    </Text>
                  </View>
                )}
              </form.Field>

              <form.Subscribe selector={(state) => state.values.popiaConsent}>
                {(popiaConsent) => (
                  <Button
                    onPress={form.handleSubmit}
                    isDisabled={isSubmitting || !popiaConsent}
                    className="mt-1"
                  >
                    {isSubmitting ? (
                      <Spinner size="sm" color="default" />
                    ) : (
                      <Button.Label>Create Account</Button.Label>
                    )}
                  </Button>
                )}
              </form.Subscribe>
            </View>
          </>
        )}
      </form.Subscribe>
    </Surface>
  );
}
