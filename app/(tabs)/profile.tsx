import { AntDesign, FontAwesome6, Ionicons } from "@expo/vector-icons";
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
import { IosButton } from "@/components/ui/ios-button";
import { IosTextField } from "@/components/ui/ios-text-field";
import { WHATSAPP_GREEN } from "@/constants/chat";
import { type ProfileResponse, setupProfile } from "@/features/auth/auth-api";
import { useAuth } from "@/features/auth/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { HttpError } from "@/lib/http";
import { useProfileStore } from "@/stores/profile-store";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { signOut } = useAuth();
  const avatarPickerRef = useRef<AvatarPickerSheetRef>(null);
  const backgroundPickerRef = useRef<BackgroundPickerSheetRef>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [originalData, setOriginalData] = useState<ProfileResponse | null>(null);

  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
  const placeholderColor = isDark ? "#636366" : "#8E8E93";

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
      setIsEditing(false);
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

  const handleEdit = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditing(true);
  };

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
      if (e instanceof HttpError) {
        const body = e.body as { error?: string };
        console.error("Failed to update profile:", body?.error ?? "Unknown error");
        Alert.alert("ข้อผิดพลาด", body?.error || "ไม่สามารถอัปเดตโปรไฟล์ได้");
      }
    }
  };

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsEditing(false);
    // Reset to original values
    if (originalData) {
      setDisplayName(originalData.display_name || "");
      setBio(originalData.bio || "");
      setSelectedBackgroundImage(originalData.background_image_url || null);
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

  const handleLogout = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert("ออกจากระบบ", "คุณต้องการออกจากระบบใช่หรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ออกจากระบบ",
        style: "destructive",
        onPress: () => {
          void signOut();
          router.replace("/(auth)");
        },
      },
    ]);
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
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={isDark ? "#FFFFFF" : "#000000"} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
          {isEditing ? (
            <Pressable onPress={handleCancel} style={styles.cancelButton}>
              <AntDesign name="close" size={20} color={"red"} />
            </Pressable>
          ) : (
            <Pressable onPress={handleEdit} style={styles.editButton}>
              <FontAwesome6 name="edit" size={20} color={isDark ? "#FFFFFF" : "#000000"} />
            </Pressable>
          )}
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
              {isEditing && (
                <Pressable
                  style={styles.editBackgroundButton}
                  onPress={handleBackgroundPickerPress}
                >
                  <Ionicons name="image" size={20} color="#FFFFFF" />
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={isEditing ? handleAvatarPress : undefined}
              style={styles.avatarPressable}
              disabled={!isEditing}
            >
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: getAvatarUrl(selectedAvatarSeed) }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              </View>
              {isEditing && (
                <View style={styles.editBadge}>
                  <Ionicons name="camera" size={16} color="#FFFFFF" />
                </View>
              )}
            </Pressable>
          </View>

          {/* Profile Info */}
          <View style={styles.infoSection}>
            <IosTextField
              label="ชื่อที่แสดง"
              value={displayName}
              onChangeText={setDisplayName}
              editable={isEditing}
              placeholder="ใส่ชื่อของคุณ"
              containerStyle={styles.field}
            />

            <View style={styles.bioContainer}>
              <ThemedText style={[styles.bioLabel, { color: placeholderColor }]}>BIO</ThemedText>
              {isEditing ? (
                <IosTextField
                  value={bio}
                  onChangeText={setBio}
                  placeholder="บอกเกี่ยวกับตัวคุณ"
                  multiline
                  numberOfLines={4}
                  containerStyle={styles.bioField}
                />
              ) : (
                <View style={[styles.bioDisplay, { borderColor: borderColor }]}>
                  <ThemedText style={[styles.bioText, { color: placeholderColor }]}>
                    {bio || "ยังไม่ได้ตั้งค่า bio"}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Save Button */}

          {/* Logout Button */}

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
              <ThemedText style={[styles.infoLabel, { color: placeholderColor }]}>
                เบอร์โทรศัพท์
              </ThemedText>
              <ThemedText style={styles.infoValue}>{profile.phone_number}</ThemedText>
            </View>
            {profile.username && (
              <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
                <ThemedText style={[styles.infoLabel, { color: placeholderColor }]}>
                  ชื่อผู้ใช้
                </ThemedText>
                <ThemedText style={styles.infoValue}>@{profile.username}</ThemedText>
              </View>
            )}
            <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
              <ThemedText style={[styles.infoLabel, { color: placeholderColor }]}>
                สมัครเมื่อ
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {new Date(profile.created_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </ThemedText>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: borderColor }]}>
              <ThemedText style={[styles.infoLabel, { color: placeholderColor }]}>
                อัปเดตล่าสุด
              </ThemedText>
              <ThemedText style={styles.infoValue}>
                {new Date(profile.updated_at).toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </ThemedText>
            </View>
          </View>

          {isEditing && (
            <View style={styles.buttonContainer}>
              <IosButton
                title="บันทึก"
                onPress={handleSave}
                loading={updateMutation.isPending}
                disabled={!displayName.trim() || updateMutation.isPending}
              />
            </View>
          )}

          {!isEditing && (
            <View style={styles.buttonContainer}>
              <IosButton title="ออกจากระบบ" onPress={handleLogout} variant="outline" destructive />
            </View>
          )}
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
  editButton: {
    padding: 4,
  },
  editText: {
    fontSize: 17,
    color: WHATSAPP_GREEN,
    fontFamily: "LINESeedSansTH_Rg",
  },
  cancelButton: {
    padding: 4,
  },
  cancelText: {
    fontSize: 17,
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
  avatarHint: {
    fontSize: 13,
    marginTop: 12,
    fontFamily: "LINESeedSansTH_Rg",
  },
  infoSection: {
    marginTop: 8,
  },
  field: {
    marginBottom: 20,
  },
  bioContainer: {
    marginBottom: 20,
  },
  bioLabel: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
    marginBottom: 4,
    textTransform: "uppercase",
    fontFamily: "LINESeedSansTH_Rg",
  },
  bioField: {
    marginBottom: 0,
  },
  bioDisplay: {
    minHeight: 100,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(142, 142, 147, 0.1)",
  },
  bioText: {
    fontSize: 17,
    letterSpacing: -0.2,
    fontFamily: "LINESeedSansTH_Rg",
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: 40,
  },
  additionalInfo: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: {
    fontSize: 15,
    fontFamily: "LINESeedSansTH_Rg",
  },
  infoValue: {
    fontSize: 15,
    fontFamily: "LINESeedSansTH_Rg",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
