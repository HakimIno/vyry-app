import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ErrorView } from "@/components/common/error-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  AVATAR_SEEDS,
  AvatarPickerSheet,
  AvatarPickerSheetRef,
  getAvatarUrl,
} from "@/components/ui/avatar-picker-sheet";
import {
  BackgroundPickerSheet,
  BackgroundPickerSheetRef,
} from "@/components/ui/background-picker-sheet";
import { IosTextField } from "@/components/ui/ios-text-field";
import { WHATSAPP_GREEN } from "@/constants/chat";
import { type ProfileResponse, setupProfile } from "@/features/auth/auth-api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProfileStore } from "@/stores/profile-store";

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const avatarPickerRef = useRef<AvatarPickerSheetRef>(null);
  const backgroundPickerRef = useRef<BackgroundPickerSheetRef>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(null);
  const [_originalData, setOriginalData] = useState<ProfileResponse | null>(null);

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const _placeholderColor = isDark ? "#636366" : "#8E8E93";

  // Fetch profile data
  const { profile, isLoading, error, refetch } = useProfileStore();

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (params: {
      displayName: string;
      bio?: string;
      profilePictureUrl?: string;
      backgroundImageUrl?: string;
    }) => {
      return await setupProfile(params);
    },
    onSuccess: () => {
      refetch();
      router.back();
    },
  });

  // Sync state with API data
  useEffect(() => {
    if (profile) {
      setOriginalData(profile);
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
      // Extract avatar seed from profile_picture_url if it's a DiceBear URL
      if (profile.profile_picture_url) {
        const urlMatch = profile.profile_picture_url.match(/seed=([^&]+)/);
        if (urlMatch && AVATAR_SEEDS.includes(urlMatch[1])) {
          setSelectedAvatarSeed(urlMatch[1]);
        }
      }
      // Set background image from API
      setSelectedBackgroundImage(profile.background_image_url || null);
    }
  }, [profile]);

  const handleSave = async () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (!displayName.trim()) {
      Alert.alert("ข้อผิดพลาด", "กรุณาใส่ชื่อที่แสดง");
      return;
    }

    const profilePictureUrl = getAvatarUrl(selectedAvatarSeed);

    try {
      await updateMutation.mutateAsync({
        displayName: displayName.trim(),
        bio: bio.trim() || undefined,
        profilePictureUrl,
        backgroundImageUrl: selectedBackgroundImage || undefined,
      });
    } catch (e) {
      const error = e as { body?: { error?: string } };
      if (error.body?.error) {
        console.error("Failed to update profile:", error.body.error);
        Alert.alert("ข้อผิดพลาด", error.body.error || "ไม่สามารถอัปเดตโปรไฟล์ได้");
      }
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    avatarPickerRef.current?.present();
  };

  const handleAvatarSelect = (seed: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedAvatarSeed(seed);
  };

  const handleBackgroundImageSelect = (imageUrl: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedBackgroundImage(imageUrl);
  };

  const handleBackgroundPickerPress = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    backgroundPickerRef.current?.present();
  };

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centerContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={isDark ? "#FFFFFF" : "#000000"} />
      </ThemedView>
    );
  }

  if (error || !profile) {
    return (
      <ErrorView
        error={error}
        onRetry={refetch}
        customMessage={error ? undefined : "ไม่พบข้อมูลโปรไฟล์"}
      />
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: borderColor }]}>
          <Pressable style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#000000"} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>แก้ไขโปรไฟล์</ThemedText>
          <Pressable onPress={handleSave} style={styles.saveButton}>
            <ThemedText style={styles.saveText}>บันทึก</ThemedText>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            {/* Background Image */}
            <View style={styles.backgroundContainer}>
              {selectedBackgroundImage ? (
                <Image
                  source={{ uri: selectedBackgroundImage }}
                  style={styles.backgroundImage}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.backgroundImage,
                    { backgroundColor: isDark ? "#1C1C1E" : "#F2F2F7" },
                  ]}
                />
              )}
              <Pressable
                style={styles.editBackgroundButton}
                onPress={handleBackgroundPickerPress}
              >
                <Ionicons name="image" size={20} color="#FFFFFF" />
              </Pressable>
            </View>

            <Pressable onPress={handleAvatarPress} style={styles.avatarPressable}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: getAvatarUrl(selectedAvatarSeed) }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              </View>
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              </View>
            </Pressable>
          </View>

          {/* Profile Fields */}
          <View style={styles.fieldsSection}>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHeader}>
                <ThemedText style={styles.fieldTitle}>ชื่อที่แสดง</ThemedText>
              </View>
              <IosTextField
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="ใส่ชื่อของคุณ"
                containerStyle={styles.field}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHeader}>
                <ThemedText style={styles.fieldTitle}>BIO</ThemedText>
              </View>
              <IosTextField
                value={bio}
                onChangeText={setBio}
                placeholder="บอกเกี่ยวกับตัวคุณ"
                multiline
                numberOfLines={4}
                containerStyle={styles.field}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Picker Sheet */}
      <AvatarPickerSheet
        ref={avatarPickerRef}
        selectedSeed={selectedAvatarSeed}
        onAvatarSelect={handleAvatarSelect}
      />

      {/* Background Image Picker Sheet */}
      <BackgroundPickerSheet
        ref={backgroundPickerRef}
        selectedImage={selectedBackgroundImage}
        onImageSelect={handleBackgroundImageSelect}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "LINESeedSansTH_Bd",
  },
  saveButton: {
    padding: 4,
  },
  saveText: {
    fontSize: 17,
    color: WHATSAPP_GREEN,
    fontFamily: "LINESeedSansTH_Rg",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 8,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  backgroundContainer: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: -120,
    position: "relative",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  editBackgroundButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPressable: {
    position: "relative",
    zIndex: 1,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 60,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 1)",
  },
  avatar: {
    width: 110,
    height: 110,
  },
  editBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  fieldsSection: {
    marginTop: 8,
  },
  fieldRow: {
    marginBottom: 20,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldTitle: {
    fontSize: 15,
    fontFamily: "LINESeedSansTH_Bd",
  },
  field: {
    marginBottom: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});