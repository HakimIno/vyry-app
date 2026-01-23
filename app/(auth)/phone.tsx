import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IosButton } from "@/components/ui/ios-button";
import { IosPhoneInput } from "@/components/ui/ios-phone-input";
import { requestOtp } from "@/features/auth/auth-api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HttpError } from "@/lib/http";
import { Fonts } from "@/constants/theme";

export default function PhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+1"); // Default to US
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => phone.trim().length >= 8 && !loading, [phone, loading]);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      // Combine country code with phone number
      const fullPhoneNumber = `${countryCode}${phone.trim()}`;

      // Request OTP from API
      await requestOtp(fullPhoneNumber);

      // Navigate to OTP screen after successful OTP request
      router.replace({ pathname: "/(auth)/otp", params: { phone: fullPhoneNumber } });
    } catch (e) {
      if (e instanceof HttpError) {
        const body = e.body as { error?: string; error_code?: string };
        setError(body?.error ?? "Unable to send verification code");
      } else {
        setError("Unable to send verification code");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={require("@/assets/bg.png")} resizeMode="cover" style={styles.bg}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View
          style={[styles.body, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: "#FFFFFF" }]}>Welcome back</ThemedText>
            <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>
              Enter your phone number to receive a verification code
            </ThemedText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <IosPhoneInput
              placeholder="Enter your phone number"
              autoComplete="tel"
              autoFocus
              value={phone}
              onChangeText={setPhone}
              onCountryChange={(_code, dialCode) => setCountryCode(dialCode)}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) void onSubmit();
              }}
              errorText={error ?? undefined}
            />
          </View>

          {/* Bottom button */}
          <View style={[styles.bottom]}>
            <ThemedText style={[styles.disclaimer, isDark && styles.disclaimerDark]}>
              We will send a one-time code to this number
            </ThemedText>
            <IosButton
              title="Continue"
              loading={loading}
              disabled={!canSubmit}
              onPress={() => void onSubmit()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: "space-between",
    marginHorizontal: 12,
  },
  header: {
    alignItems: "center",
    marginTop: 48,
    marginBottom: 28,
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: "#1C1C1E",
    textAlign: "center",
    lineHeight: 13 * 1.3,
  },
  titleDark: {
    color: "#FFFFFF",
  },
  subtitle: {
    fontSize: 11,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: Fonts.regular,
    lineHeight: 11 * 1.3,
  },
  subtitleDark: {
    color: "#FFFFFF",
  },
  form: {
    flex: 1,
    width: "100%",
    paddingHorizontal: 16,
    gap: 12,
  },
  bottom: {
    gap: 12,
    paddingHorizontal: 12,
  },
  disclaimer: {
    fontSize: 11,
    fontFamily: "LINESeedSansTH_Rg",
    color: "#FFFFFF",
    textAlign: "center",
  },
  disclaimerDark: {
    color: "#FFFFFF",
  },
});
