import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ArchivedSectionProps {
  onPress?: () => void;
}

export function ArchivedSection({ onPress }: ArchivedSectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";

  const handlePress = () => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={handlePress}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="archive-outline" size={20} color={textColor} />
      </View>
      <ThemedText style={[styles.text, { color: textColor }]}>Archived</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 20,
    alignItems: "center",
    marginRight: 16,
  },
  text: {
    fontSize: 14,
    fontFamily: "LINESeedSansTH_Rg",
    letterSpacing: -0.2,
  },
});
