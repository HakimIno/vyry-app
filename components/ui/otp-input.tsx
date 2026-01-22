import React, { useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '../themed-text';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
}

const { width } = Dimensions.get('window');

export function OtpInput({
  length = 6,
  value,
  onChange,
  autoFocus = true,
  error = false,
}: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const shakeAnim = useSharedValue(0);

  useEffect(() => {
    if (error) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      shakeAnim.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [error]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));


  const handleChange = (text: string) => {
    const cleanText = text.replace(/\D/g, '').slice(0, length);
    if (cleanText.length > value.length && Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onChange(cleanText);
  };

  const digits = value.split('');

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[styles.inputContainer, animatedStyle]}
        pointerEvents="none"
      >
        {Array.from({ length }, (_, i) => {
          const isActive = i === value.length && isFocused;
          const isFilled = digits[i] !== undefined;

          return (
            <OtpDigitBox
              key={i}
              digit={digits[i]}
              isActive={isActive}
              isFilled={isFilled}
              error={error}
            />
          );
        })}
      </Animated.View>

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
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        selectTextOnFocus={false}
        secureTextEntry={false}
        showSoftInputOnFocus={true}
        editable={true}
      />
    </View>
  );
}

function OtpDigitBox({
  digit,
  isActive,
  isFilled,
  error,
}: {
  digit?: string;
  isActive: boolean;
  isFilled: boolean;
  error: boolean;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (isFilled) {
      scale.value = withSequence(
        withSpring(1.05, { damping: 15, stiffness: 300 }),
        withSpring(1, { damping: 15, stiffness: 300 })
      );
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isFilled]);

  useEffect(() => {
    if (isActive) {
      opacity.value = withTiming(0.6, { duration: 200 });
    } else if (!isFilled) {
      opacity.value = withTiming(0.3, { duration: 200 });
    }
  }, [isActive, isFilled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const getBorderColor = () => {
    if (error) return '#FF453A';
    if (isActive) return '#0A84FF';
    if (isFilled) return 'rgba(255, 255, 255, 0.6)';
    return 'rgba(255, 255, 255, 0.3)';
  };

  const getBackgroundColor = () => {
    if (error) return 'rgba(255, 69, 58, 0.1)';
    if (isActive) return 'rgba(10, 132, 255, 0.1)';
    return 'rgba(255, 255, 255, 0.05)';
  };

  return (
    <Animated.View
      style={[
        styles.digitContainer,
        {
          width: width * 0.12,
          height: width * 0.12,
          borderColor: getBorderColor(),
          backgroundColor: getBackgroundColor(),
        },
        animatedStyle,
      ]}
    >
      <View style={styles.digitInnerContainer}>
        {digit ? (
          <ThemedText style={styles.digit}>
            {digit}
          </ThemedText>
        ) : isActive ? (
          <View style={styles.cursor} />
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    zIndex: 1,
  },
  digitContainer: {
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  digitInnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  digit: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  cursor: {
    width: 3,
    height: 28,
    backgroundColor: '#0A84FF',
    borderRadius: 2,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 0,
  },
});