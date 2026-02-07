import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { IosButton } from "@/components/ui/ios-button";
import { OtpInput } from "@/components/ui/otp-input";
import { requestOtp, verifyOtp } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HttpError } from "@/lib/http";
import { uuidv4 } from "@/lib/uuid";
import { Fonts } from "@/constants/theme";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const _isDark = colorScheme === "dark";
  const { setSessionFromVerifyOtp, deviceUuid } = useAuth();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [_resending, setResending] = useState(false);

  const canSubmit = useMemo(() => otp.length === OTP_LENGTH && !loading, [otp, loading]);

  const handleVerify = useCallback(async () => {
    if (!phone || otp.length !== OTP_LENGTH) return;
    setError(null);
    setLoading(true);
    try {
      const deviceUuidToUse = deviceUuid || uuidv4();
      const res = await verifyOtp({
        phoneNumber: phone,
        otp,
        deviceUuid: deviceUuidToUse,
      });

      await setSessionFromVerifyOtp(res);
      // Navigation is handled by AuthGuard after state update
    } catch (e) {
      setOtp(""); // Clear OTP on error
      if (e instanceof HttpError) {
        const body = e.body as { error?: string; error_code?: string };
        setError(body?.error ?? "รหัส OTP ไม่ถูกต้อง");
      } else {
        setError("ยืนยัน OTP ไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }, [phone, otp, deviceUuid, setSessionFromVerifyOtp]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === OTP_LENGTH && !loading) {
      // Verify OTP when complete (OTP was already requested on phone screen)
      void handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp, loading, handleVerify]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    if (!phone || countdown > 0) return;
    setResending(true);
    setError(null);
    try {
      await requestOtp(phone);
      setCountdown(RESEND_COOLDOWN);
    } catch {
      setError("ส่ง OTP ใหม่ไม่สำเร็จ");
    } finally {
      setResending(false);
    }
  };

  const formatPhone = (num: string) => {
    if (num.length === 10) {
      return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
    }
    return num;
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
            <ThemedText style={[styles.title, { color: "#FFFFFF" }]}>
              Verify your phone number
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: "#FFFFFF" }]}>
              Enter the 6-digit code sent to your phone
            </ThemedText>
            <ThemedText style={[styles.phoneNumber]}>
              {formatPhone(phone ?? "")}
            </ThemedText>
            {/* Form */}

            <View style={styles.form}>
              <OtpInput
                length={OTP_LENGTH}
                value={otp}
                onChange={setOtp}
                autoFocus
                error={!!error}
              />
              {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
            </View>

            <View style={styles.resendContainer}>
              {countdown > 0 ? (
                <ThemedText style={[styles.resendText]}>
                  Resend code in {countdown} seconds
                </ThemedText>
              ) : (
                <Pressable onPress={() => void handleResend()} disabled={countdown > 0}>
                  <ThemedText style={[styles.resendText, {
                    color: "#6EE28B",
                    textDecorationLine: countdown > 0 ? "none" : "underline",
                    fontFamily: Fonts.bold,
                    fontSize: 12
                  }]}>
                    Resend code
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          {/* Bottom button */}
          <View style={[styles.bottom]}>
            <IosButton
              title="Continue"
              loading={loading}
              disabled={!canSubmit}
              onPress={() => void handleVerify()}
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
  phoneNumber: {
    fontSize: 11,
    color: "#6EE28B",
    textAlign: "center",
    fontFamily: Fonts.regular,
    lineHeight: 11 * 1.3,
    marginTop: 4,
    textDecorationLine: "underline",
  },
  phoneNumberDark: {
    color: "#FFFFFF",
  },
  form: {
    width: "100%",
    paddingHorizontal: 16,
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  errorText: {
    fontSize: 12,
    color: "#FF3B30",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  resendContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  resendText: {
    fontSize: 11,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: Fonts.regular,
    lineHeight: 11 * 1.3,
  },
  bottom: {
    gap: 12,
    paddingHorizontal: 12,
  },
});
