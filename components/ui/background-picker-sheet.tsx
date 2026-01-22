import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { Platform, StyleSheet, View, FlatList, Pressable } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '../themed-text';

// Sample background images - in a real app these would come from an API
const SAMPLE_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=300&fit=crop',
  'https://images.unsplash.com/photo-1494500764479-0c8f2919a3d8?w=800&h=300&fit=crop',
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&h=300&fit=crop',
  'https://images.unsplash.com/photo-1483729558449-99ef3a9b7b79?w=800&h=300&fit=crop',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=300&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=300&fit=crop',
];

export interface BackgroundPickerSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface BackgroundPickerSheetProps {
  selectedImage?: string | null;
  onImageSelect: (imageUrl: string) => void;
}

export const BackgroundPickerSheet = forwardRef<BackgroundPickerSheetRef, BackgroundPickerSheetProps>(
  ({ selectedImage, onImageSelect }, ref) => {
    const sheetRef = React.useRef<TrueSheet>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present();
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
      },
    }));

    const handleImageSelect = (imageUrl: string) => {
      onImageSelect(imageUrl);
      sheetRef.current?.dismiss();
    };

    const renderBackgroundItem = ({ item: imageUrl }: { item: string }) => {
      const isSelected = selectedImage === imageUrl;

      return (
        <Pressable
          style={[
            styles.imageItem,
            isSelected && styles.imageItemSelected,
          ]}
          onPress={() => handleImageSelect(imageUrl)}
        >
          <View style={[
            styles.imageContainer,
            isSelected && styles.imageContainerSelected,
          ]}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.backgroundImage}
              contentFit="cover"
              transition={200}
            />
          </View>
          {isSelected && (
            <View style={styles.checkmark}>
              <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
            </View>
          )}
        </Pressable>
      );
    };

    return (
      <TrueSheet
        ref={sheetRef}
        cornerRadius={16}
        detents={[0.8]}
        backgroundColor={isDark ? '#1A1A1A' : '#FFFFFF'}
        scrollable
      >
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.content}>
            <ThemedText style={styles.title}>เลือกพื้นหลัง</ThemedText>
            <View style={styles.listContainer}>
              <FlatList
                data={SAMPLE_BACKGROUNDS}
                keyExtractor={(item) => item}
                renderItem={renderBackgroundItem}
                numColumns={2}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                columnWrapperStyle={styles.row}
                nestedScrollEnabled
                overScrollMode='never'
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
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 14,
    margin: 8,
    letterSpacing: -0.3,
    textAlign: 'center',
    fontFamily: 'Roboto_700Bold',
  },
  listContainer: {
    flex: 1,
  },
  gridContainer: {
    paddingBottom: 20,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  imageItem: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    minWidth: 150,
  },
  imageItemSelected: {
    transform: [{ scale: 1.05 }],
  },
  imageContainer: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  imageContainerSelected: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  checkmark: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
});