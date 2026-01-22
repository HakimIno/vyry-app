import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

interface PinInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
  secure?: boolean;
  large?: boolean;
}

export function PinInput({
  length = 6,
  value,
  onChange,
  autoFocus = true,
  error = false,
  secure = true,
  large = false,
}: PinInputProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shakeAnim = useSharedValue(0);

  useEffect(() => {
    if (error) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      shakeAnim.value = withSequence(
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(-12, { duration: 50 }),
        withTiming(12, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handleChange = (text: string) => {
    const cleanText = text.replace(/\D/g, '').slice(0, length);
    if (cleanText.length > value.length && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onChange(cleanText);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress}>
        <Animated.View style={[styles.dotsContainer, animatedStyle]}>
          {Array.from({ length }, (_, i) => {
            const isFilled = value.length > i;
            const isActive = i === value.length && isFocused;

            return (
              <PinDot
                key={i}
                isFilled={isFilled}
                isActive={isActive}
                error={error}
                isDark={isDark}
                secure={secure}
                digit={secure ? undefined : value[i]}
                large={large}
              />
            );
          })}
        </Animated.View>
      </Pressable>

      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        caretHidden
        secureTextEntry
      />
    </View>
  );
}

function PinDot({
  isFilled,
  isActive,
  error,
  isDark,
  secure,
  digit,
  large = false,
}: {
  isFilled: boolean;
  isActive: boolean;
  error: boolean;
  isDark: boolean;
  secure: boolean;
  digit?: string;
  large?: boolean;
}) {
  const opacity = useSharedValue(isFilled ? 1 : 0);

  useEffect(() => {
    if (isFilled) {
      opacity.value = withTiming(1, {
        duration: 200,
      });
    } else {
      opacity.value = withTiming(0, {
        duration: 150,
      });
    }
  }, [isFilled]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const getBorderColor = () => {
    if (error) return 'rgba(255, 59, 48, 0.5)';
    if (isActive) return 'rgba(255, 255, 255, 0.4)';
    return 'rgba(255, 255, 255, 0.2)';
  };

  return (
    <View
      style={[
        large ? styles.dotLarge : styles.dot,
        {
          borderColor: getBorderColor(),
        },
      ]}
    >
      <Animated.View
        style={[
          large ? styles.dotFillLarge : styles.dotFill,
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotFill: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  dotFillLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

