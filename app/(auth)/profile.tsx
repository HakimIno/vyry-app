import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, ImageBackground, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import { useAuth } from '@/features/auth/auth-context';
import { setupProfile } from '@/features/auth/auth-api';
import { HttpError } from '@/lib/http';
import { IosButton } from '@/components/ui/ios-button';
import { IosTextField } from '@/components/ui/ios-text-field';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { 
  AvatarPickerSheet, 
  AvatarPickerSheetRef, 
  getAvatarUrl, 
  AVATAR_SEEDS 
} from '@/components/ui/avatar-picker-sheet';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { signOut, completeProfileSetup } = useAuth();
  const avatarPickerRef = useRef<AvatarPickerSheetRef>(null);

  const [name, setName] = useState('');
  const [selectedAvatarSeed, setSelectedAvatarSeed] = useState(AVATAR_SEEDS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length >= 2 && !loading, [name, loading]);

  const onSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      await setupProfile({ displayName: name.trim() });
      await completeProfileSetup();
      // Navigation is handled by AuthGuard after state update
    } catch (e) {
      if (e instanceof HttpError) {
        const body = e.body as { error?: string };
        setError(body?.error ?? 'บันทึกโปรไฟล์ไม่สำเร็จ');
      } else {
        setError('บันทึกโปรไฟล์ไม่สำเร็จ');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarPress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    avatarPickerRef.current?.present();
  };

  const handleAvatarSelect = (seed: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedAvatarSeed(seed);
  };

  const handleChangePhone = async () => {
    await signOut();
    // Navigation is handled by AuthGuard after signOut
  };

  // Prevent back navigation - user must use "Change Phone" button or complete profile
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Prevent back navigation
      return true;
    });

    return () => backHandler.remove();
  }, []);

  return (
    <ImageBackground
      source={require('@/assets/bg.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.body, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: '#FFFFFF' }]}>
              Setup your profile
            </ThemedText>
            <ThemedText style={[styles.subtitle, { color: '#FFFFFF' }]}>
              Select an avatar and set your display name
            </ThemedText>
          </View>

          {/* Avatar Picker */}
          <View style={styles.avatarSection}>
            <Pressable onPress={handleAvatarPress} style={styles.avatarPressable}>
              <View style={styles.selectedAvatarContainer}>
                <Image
                  source={{ uri: getAvatarUrl(selectedAvatarSeed) }}
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
              label="ชื่อที่แสดง"
              placeholder="ใส่ชื่อของคุณ"
              autoCapitalize="words"
              autoComplete="name"
              value={name}
              onChangeText={setName}
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canSubmit) void onSubmit();
              }}
              errorText={error ?? undefined}
            />
          </View>

          {/* Bottom button */}
          <View style={styles.bottom}>
            <IosButton
              title="Continue"
              loading={loading}
              disabled={!canSubmit}
              onPress={() => void onSubmit()}
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
    width: '100%',
    height: '100%',
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 12,
  },
  header: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 28,
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Roboto_500Medium',
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 13 * 1.3,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 11,
    color: '#FFFFFF',
    textAlign: 'center',
    fontFamily: 'Roboto_400Regular',
    lineHeight: 11 * 1.3,
  },
  subtitleDark: {
    color: '#FFFFFF',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarPressable: {
    position: 'relative',
  },
  selectedAvatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(55, 49, 49, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedAvatar: {
    width: 88,
    height: 88,
    marginTop: 10
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  tapToChange: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Roboto_400Regular',
  },
  form: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 16,
    gap: 12,
  },
  bottom: {
    gap: 12,
    paddingHorizontal: 12,
  },
});
