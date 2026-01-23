import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useProfile } from "@/stores/profile-store";
import { AVATAR_SEEDS, getAvatarUrl } from "../ui/avatar-picker-sheet";
import { SearchBar } from "./search-bar";

interface ChatHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onCameraPress?: () => void;
  onNewChatPress?: () => void;
  onMorePress?: () => void;
}

// Sub-component: Header action button
function _HeaderButton({
  icon,
  onPress,
  color,
  backgroundColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color: string;
  backgroundColor?: string;
}) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <Pressable
      style={[styles.iconButton, backgroundColor && { backgroundColor }]}
      onPress={handlePress}
    >
      <Ionicons name={icon} size={22} color={color} />
    </Pressable>
  );
}

export function ChatHeader({
  searchQuery,
  onSearchChange,
  onCameraPress,
  onNewChatPress,
  onMorePress,
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { profile, isLoading, error } = useProfile();

  const iconColor = isDark ? "#FFFFFF" : "#1C1C1E";

  // Get avatar seed from profile or use default
  const getProfileAvatarUrl = () => {
    if (profile?.profile_picture_url) {
      // Extract avatar seed from profile_picture_url if it's a DiceBear URL
      const urlMatch = profile.profile_picture_url.match(/seed=([^&]+)/);
      if (urlMatch && AVATAR_SEEDS.includes(urlMatch[1])) {
        return getAvatarUrl(urlMatch[1]);
      }
      // If it's a full URL, use it directly
      return profile.profile_picture_url;
    }
    // Default avatar
    return getAvatarUrl(AVATAR_SEEDS[0]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Top row with title and action buttons */}
      <View style={styles.topRow}>
        <ThemedText style={styles.title}>Chats</ThemedText>

        <View style={styles.rightSection}>
          {/* Profile */}

          {/* <HeaderButton
            icon="person"
            onPress={() => router.push('/profile')}
            color={iconColor}
          /> */}

          <Pressable onPress={() => router.push("/profile")}>
            {isLoading ? (
              <ActivityIndicator size="small" color={iconColor} />
            ) : error ? (
              <Ionicons name="person" size={24} color={iconColor} />
            ) : (
              <Image source={{ uri: getProfileAvatarUrl() }} style={styles.profileImage} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchWrapper}>
        <SearchBar
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Ask Meta AI or Search"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "LINESeedSansTH_Bd",
    letterSpacing: -0.5,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  searchWrapper: {
    marginTop: 0,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
