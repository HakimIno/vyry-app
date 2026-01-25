import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import {
  AVATAR_SEEDS,
  AvatarPickerSheet,
  AvatarPickerSheetRef,
  getAvatarUrl,
} from "@/components/ui/avatar-picker-sheet";
import { IosButton } from "@/components/ui/ios-button";
import { IosTextField } from "@/components/ui/ios-text-field";
import { setupProfile } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HttpError } from "@/lib/http";
import { Fonts } from "@/constants/theme";

// Constants
const MIN_NAME_LENGTH = 2;
const AVATAR_SIZE = 100;
const EDIT_BADGE_SIZE = 28;
const AVATAR_IMAGE_SIZE = 88;
const AVATAR_IMAGE_MARGIN = 10;
const EDIT_BADGE_BORDER_WIDTH = 2;
const AVATAR_RADIUS = AVATAR_SIZE / 2;
const EDIT_BADGE_RADIUS = EDIT_BADGE_SIZE / 2;

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { signOut, completeProfileSetup } = useAuth();
  const avatarPickerRef = useRef<AvatarPickerSheetRef>(null);

  const [name, setName] = useState("");
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize computed values
  const canSubmit = useMemo(() => name.trim().length >= MIN_NAME_LENGTH && !loading, [name, loading]);
  const profilePictureUrl = useMemo(() => getAvatarUrl(selectedAvatarSeed), [selectedAvatarSeed]);

  // Handle profile submission
  const handleProfileSubmit = useCallback(async () => {
    if (!canSubmit) return;
    
    setError(null);
    setLoading(true);
    
    try {
      await setupProfile({
        displayName: name.trim(),
        profilePictureUrl,
      });
      await completeProfileSetup();
      // Navigation is handled by AuthGuard after state update
    } catch (e) {
      if (e instanceof HttpError) {
        const body = e.body as { error?: string };
        setError(body?.error ?? "บันทึกโปรไฟล์ไม่สำเร็จ");
      } else {
        setError("บันทึกโปรไฟล์ไม่สำเร็จ");
      }
    } finally {
      setLoading(false);
    }
  }, [canSubmit, name, profilePictureUrl, completeProfileSetup]);

  // Handle avatar picker interactions
  const handleAvatarPress = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    avatarPickerRef.current?.present();
  }, []);

  const handleAvatarSelect = useCallback((seed: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedAvatarSeed(seed);
  }, []);

  // Prevent back navigation - user must use "Change Phone" button or complete profile
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      // Prevent back navigation
      return true;
    });

    return () => backHandler.remove();
  }, []);

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
            <ThemedText style={styles.title}>Setup your profile</ThemedText>
            <ThemedText style={styles.subtitle}>
              Select an avatar and set your display name
            </ThemedText>
          </View>

          {/* Avatar Picker */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress} style={styles.avatarPressable}>
              <View style={styles.selectedAvatarContainer}>
                <Image
                  source={{ uri: profilePictureUrl }}
                  style={styles.selectedAvatar}
                  contentFit="contain"
                />
              </View>
              <View style={styles.editBadge}>
                <Ionicons name="pencil" size={14} color="#FFFFFF" />
              </View>
            </Pressable>
            <ThemedText style={styles.tapToChange}>Tap to change</ThemedText>
          </View>

          {/* Name Input */}
          <View style={styles.form}>
            <IosTextField
              label="Username"
              placeholder="Enter your username"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={handleProfileSubmit}
              errorText={error ?? undefined}
            />
          </View>

          {/* Bottom button */}
          <View style={styles.bottom}>
            <IosButton
              title="Continue"
              loading={loading}
              disabled={!canSubmit}
              onPress={handleProfileSubmit}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Avatar Picker Sheet */}
      <AvatarPickerSheet
        ref={avatarPickerRef}
        selectedSeed={selectedAvatarSeed}
        onAvatarSelect={handleAvatarSelect}
      />
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
    fontWeight: "800",
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 13 * 1.3,
  },
  subtitle: {
    fontSize: 11,
    color: "#FFFFFF",
    textAlign: "center",
    fontFamily: Fonts.regular,
    lineHeight: 11 * 1.3,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarPressable: {
    position: "relative",
  },
  selectedAvatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_RADIUS,
    backgroundColor: "rgba(9, 9, 9, 1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedAvatar: {
    width: AVATAR_IMAGE_SIZE,
    height: AVATAR_IMAGE_SIZE,
    marginTop: AVATAR_IMAGE_MARGIN,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: EDIT_BADGE_SIZE,
    height: EDIT_BADGE_SIZE,
    borderRadius: EDIT_BADGE_RADIUS,
    backgroundColor: "#6EE28B",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: EDIT_BADGE_BORDER_WIDTH,
    borderColor: "#FFFFFF",
  },
  tapToChange: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
    fontFamily: Fonts.regular,
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
});
