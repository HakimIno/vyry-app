import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  }, [error, shakeAnim]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  const handlePress = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback(
    (text: string) => {
      const cleanText = text.replace(/\D/g, '').slice(0, length);
      if (cleanText.length > value.length && Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onChange(cleanText);
    },
    [length, value.length, onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const dots = useMemo(
    () =>
      Array.from({ length }, (_, i) => {
        const isFilled = value.length > i;
        const isActive = i === value.length && isFocused;

        return (
          <PinDot
            // biome-ignore lint/suspicious/noArrayIndexKey: order is fixed
            key={`pin-${i}`}
            isFilled={isFilled}
            isActive={isActive}
            error={error}
            isDark={isDark}
            secure={secure}
            digit={secure ? undefined : value[i]}
            large={large}
          />
        );
      }),
    [length, value, isFocused, error, isDark, secure, large]
  );

  return (
    <View style={styles.container}>
      <Pressable onPress={handlePress}>
        <Animated.View style={[styles.dotsContainer, animatedStyle]}>
          {dots}
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
        onFocus={handleFocus}
        onBlur={handleBlur}
        caretHidden
        secureTextEntry
      />
    </View>
  );
}

const PinDot = React.memo(
  ({
    isFilled,
    isActive,
    error,
    isDark: _isDark,
    secure: _secure,
    digit: _digit,
    large = false,
  }: {
    isFilled: boolean;
    isActive: boolean;
    error: boolean;
    isDark: boolean;
    secure: boolean;
    digit?: string;
    large?: boolean;
  }) => {
    const opacity = useSharedValue(isFilled ? 1 : 0);

    useEffect(() => {
      opacity.value = withTiming(isFilled ? 1 : 0, {
        duration: isFilled ? 200 : 150,
      });
    }, [isFilled, opacity]);

    const animatedStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
    }));

    const borderColor = useMemo(() => {
      if (error) return 'rgba(255, 59, 48, 0.5)';
      if (isActive) return 'rgba(255, 255, 255, 0.4)';
      return 'rgba(255, 255, 255, 0.2)';
    }, [error, isActive]);

    return (
      <View
        style={[
          large ? styles.dotLarge : styles.dot,
          {
            borderColor,
          },
        ]}
      >
        <Animated.View
          style={[large ? styles.dotFillLarge : styles.dotFill, animatedStyle]}
        />
      </View>
    );
  }
);

PinDot.displayName = 'PinDot';

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

