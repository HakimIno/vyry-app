import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Image } from "expo-image";
import React, { forwardRef, useImperativeHandle } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "../themed-text";

// Generate unique avatar seeds
const AVATAR_SEEDS = [
  "felix",
  "luna",
  "max",
  "bella",
  "charlie",
  "coco",
  "rocky",
  "daisy",
  "buddy",
  "lucy",
  "jack",
  "lily",
  "duke",
  "sadie",
  "bear",
  "molly",
  "tucker",
  "sophie",
  "oliver",
  "chloe",
  "belle",
  "rex",
  "will",
  "sandy",
  "milo",
  "zoey",
  "oscar",
  "ruby",
  "leo",
  "mia",
  "sam",
  "ava",
  "noah",
  "emma",
  "lucas",
  "isabella",
  "henry",
  "olivia",
  "ethan",
  "sophia",
  "alex",
  "grace",
  "daniel",
  "ella",
  "james",
  "charlotte",
  "benjamin",
  "amelia",
  "mason",
  "harper",
  "kim",
  "snow",
];

export interface AvatarPickerSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface AvatarPickerSheetProps {
  selectedSeed: string;
  onAvatarSelect: (seed: string) => void;
}

export function getAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(seed)}&size=512`;
}

export { AVATAR_SEEDS };

export const AvatarPickerSheet = forwardRef<AvatarPickerSheetRef, AvatarPickerSheetProps>(
  ({ selectedSeed, onAvatarSelect }, ref) => {
    const sheetRef = React.useRef<TrueSheet>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present();
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
      },
    }));

    const handleAvatarSelect = (seed: string) => {
      onAvatarSelect(seed);
      sheetRef.current?.dismiss();
    };

    const renderAvatarItem = ({ item: seed }: { item: string }) => {
      const isSelected = selectedSeed === seed;

      return (
        <Pressable
          style={[styles.avatarItem, isSelected && styles.avatarItemSelected]}
          onPress={() => handleAvatarSelect(seed)}
        >
          <View
            style={[styles.avatarImageContainer, isSelected && styles.avatarImageContainerSelected]}
          >
            <Image
              source={{ uri: getAvatarUrl(seed) }}
              style={styles.avatarImage}
              contentFit="cover"
              transition={200}
            />
          </View>
          {isSelected && (
            <View style={styles.checkmark}>
              <Ionicons name="checkmark-circle" size={20} color="#6EE28B" />
            </View>
          )}
        </Pressable>
      );
    };

    return (
      <TrueSheet
        ref={sheetRef}
        cornerRadius={16}
        detents={[0.6]}
        backgroundColor={isDark ? "#101010" : "#FFFFFF"}
        scrollable
      >
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.content}>
            <ThemedText style={styles.title}>เลือกรูปโปรไฟล์</ThemedText>
            <View style={styles.listContainer}>
              <FlatList
                data={AVATAR_SEEDS}
                keyExtractor={(item) => item}
                renderItem={renderAvatarItem}
                numColumns={4}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.row}
                nestedScrollEnabled
                overScrollMode="never"
              />
            </View>
          </View>
        </GestureHandlerRootView>
      </TrueSheet>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 14,
    margin: 8,
    letterSpacing: -0.3,
    textAlign: "center",
    fontFamily: "LINESeedSansTH_Bd",
  },
  subtitle: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
    marginBottom: 20,
  },
  subtitleDark: {
    color: "#8E8E93",
  },
  listContainer: {
    flex: 1,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  avatarItem: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    width: "23%",
    minWidth: 70,
  },
  avatarItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  avatarImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImageContainerSelected: {
    borderWidth: 3,
    borderColor: "#6EE28B",
  },
  avatarImage: {
    width: 64,
    height: 64,
    marginTop: 8,
  },
  checkmark: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
  },
});
