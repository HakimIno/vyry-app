import { FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
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
import { AVATAR_SEEDS, getAvatarUrl } from "@/components/ui/avatar-picker-sheet";
import { IosButton } from "@/components/ui/ios-button";

import { useAuth } from "@/features/auth/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProfileStore } from "@/stores/profile-store";
import { AvatarColors, Fonts, ProfileColors, ProfileDimensions } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const _isDark = colorScheme === "dark";
  const { signOut } = useAuth();
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState<string | null>(null);

  const profileColors = ProfileColors[colorScheme as keyof typeof ProfileColors];
  const bgColor = profileColors.background;
  const cardBgColor = profileColors.cardBackground;
  const borderColor = profileColors.border;
  const placeholderColor = profileColors.placeholder;
  const secondaryBgColor = profileColors.secondaryBackground;

  // Fetch profile data
  const { profile, isLoading, error, refetch } = useProfileStore();

  // Sync state with API data
  useEffect(() => {
    if (profile) {
      if (profile.profile_picture_url) {
        const urlMatch = profile.profile_picture_url.match(/seed=([^&]+)/);
        if (urlMatch && AVATAR_SEEDS.includes(urlMatch[1])) {
          setSelectedAvatarSeed(urlMatch[1]);
        }
      }
      setSelectedBackgroundImage(profile.background_image_url || null);
    }
  }, [profile]);

  const handleEdit = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/(tabs)/edit-profile");
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
        <ActivityIndicator size="large" color={profileColors.text} />
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
            <Ionicons name="arrow-back" size={24} color={profileColors.text} />
          </Pressable>
          <ThemedText style={styles.headerTitle}>โปรไฟล์</ThemedText>
          <Pressable onPress={handleEdit} style={styles.editButton}>
            <FontAwesome6 name="edit" size={20} color={profileColors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <View style={[styles.profileCard, { backgroundColor: cardBgColor }]}>
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
                    { backgroundColor: profileColors.defaultBackground },
                  ]}
                />
              )}
              {/* Gradient Overlay */}
              <View style={[styles.gradientOverlay, { backgroundColor: cardBgColor }]} />
            </View>

            {/* Avatar */}
            <View style={styles.avatarWrapper}>
              <View style={[styles.avatarContainer, { borderColor: AvatarColors[colorScheme as keyof typeof AvatarColors].border, backgroundColor: AvatarColors[colorScheme as keyof typeof AvatarColors].bg }]}>
                <Image
                  source={{ uri: getAvatarUrl(selectedAvatarSeed) }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              </View>
            </View>

            {/* Profile Info */}
            <View style={styles.profileInfo}>
              <ThemedText style={styles.displayName}>
                {profile?.display_name || "ไม่มีชื่อ"}
              </ThemedText>

              {profile?.bio && (
                <ThemedText style={[styles.bioText, { color: placeholderColor }]}>
                  {profile.bio}
                </ThemedText>
              )}
            </View>
          </View>



          {/* Settings Section */}
          <View style={styles.sectionContainer}>
            <ThemedText style={[styles.sectionTitle, { color: placeholderColor }]}>
              ตั้งค่า
            </ThemedText>

            <View style={[styles.settingsCard, { backgroundColor: cardBgColor }]}>
              <Pressable
                style={[styles.settingsItem, { borderBottomColor: borderColor }]}
                onPress={() => { }}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: secondaryBgColor }]}>
                    <Ionicons name="notifications" size={20} color={profileColors.text} />
                  </View>
                  <ThemedText style={styles.settingsItemText}>การแจ้งเตือน</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={placeholderColor} />
              </Pressable>

              <Pressable
                style={[styles.settingsItem, { borderBottomColor: borderColor }]}
                onPress={() => { }}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: secondaryBgColor }]}>
                    <Ionicons name="shield-checkmark" size={20} color={profileColors.text} />
                  </View>
                  <ThemedText style={styles.settingsItemText}>ความเป็นส่วนตัว</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={placeholderColor} />
              </Pressable>

              <Pressable
                style={styles.settingsItem}
                onPress={() => { }}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: secondaryBgColor }]}>
                    <MaterialIcons name="help-outline" size={20} color={profileColors.text} />
                  </View>
                  <ThemedText style={styles.settingsItemText}>ช่วยเหลือและสนับสนุน</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={placeholderColor} />
              </Pressable>
            </View>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutContainer}>
            <IosButton
              title="ออกจากระบบ"
              onPress={handleLogout}
              variant="outline"
              destructive
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: ProfileDimensions.header.paddingHorizontal,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
  },
  editButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: ProfileDimensions.content.paddingHorizontal,
    paddingTop: ProfileDimensions.content.paddingTop,
  },

  // Profile Card
  profileCard: {
    borderRadius: ProfileDimensions.profileCard.borderRadius,
    overflow: "hidden",
    marginBottom: ProfileDimensions.profileCard.marginBottom,
  },
  backgroundContainer: {
    width: "100%",
    height: ProfileDimensions.background.height,
    position: "relative",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: ProfileDimensions.background.gradientHeight,
    borderTopLeftRadius: ProfileDimensions.background.gradientRadius,
    borderTopRightRadius: ProfileDimensions.background.gradientRadius,
  },
  avatarWrapper: {
    alignItems: "center",
    marginTop: ProfileDimensions.avatar.wrapper.marginTop,
    marginBottom: ProfileDimensions.avatar.wrapper.marginBottom,
  },
  avatarContainer: {
    width: ProfileDimensions.avatar.container.width,
    height: ProfileDimensions.avatar.container.height,
    borderRadius: ProfileDimensions.avatar.container.borderRadius,
    overflow: "hidden",
    borderWidth: ProfileDimensions.avatar.container.borderWidth,
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  profileInfo: {
    paddingHorizontal: ProfileDimensions.profileInfo.paddingHorizontal,
    paddingBottom: ProfileDimensions.profileInfo.paddingBottom,
    alignItems: "center",
  },
  displayName: {
    fontSize: ProfileDimensions.displayName.fontSize,
    fontFamily: Fonts.bold,
    marginBottom: ProfileDimensions.displayName.marginBottom,
    textAlign: "center",
  },
  bioText: {
    fontFamily: Fonts.regular,
    textAlign: ProfileDimensions.bioText.textAlign,
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  statDivider: {
    width: 1,
    marginHorizontal: 8,
  },

  // Settings Section
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: ProfileDimensions.sectionTitle.fontSize,
    fontFamily: Fonts.bold,
    textTransform: "uppercase",
    marginBottom: ProfileDimensions.sectionTitle.marginBottom,
    paddingHorizontal: ProfileDimensions.sectionTitle.paddingHorizontal,
  },
  settingsCard: {
    borderRadius: ProfileDimensions.settingsCard.borderRadius,
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: ProfileDimensions.settingsItem.paddingVertical,
    paddingHorizontal: ProfileDimensions.settingsItem.paddingHorizontal,
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: ProfileDimensions.settingsItem.gap,
  },
  iconContainer: {
    width: ProfileDimensions.iconContainer.width,
    height: ProfileDimensions.iconContainer.height,
    borderRadius: ProfileDimensions.iconContainer.borderRadius,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsItemText: {
    fontSize: 16,
    fontFamily: Fonts.regular,
  },

  // Logout
  logoutContainer: {
    margin: ProfileDimensions.logoutContainer.margin,

  },

  centerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
});