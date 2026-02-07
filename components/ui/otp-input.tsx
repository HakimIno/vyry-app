import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, Platform, StyleSheet, TextInput, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "../themed-text";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  error?: boolean;
}

const { width } = Dimensions.get("window");
const DIGIT_SIZE = width * 0.12;
const ANIMATION_CONFIG = {
  SPRING: { damping: 15, stiffness: 300 },
  TIMING_FAST: { duration: 200 },
  TIMING_SHAKE: { duration: 50 },
};

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

  // Memoize digits array to prevent unnecessary recalculations
  const digits = useMemo(() => value.split(""), [value]);

  // Handle shake animation when error occurs
  useEffect(() => {
    if (error) {
      if (Platform.OS !== "web") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      shakeAnim.value = withSequence(
        withTiming(-10, ANIMATION_CONFIG.TIMING_SHAKE),
        withTiming(10, ANIMATION_CONFIG.TIMING_SHAKE),
        withTiming(-10, ANIMATION_CONFIG.TIMING_SHAKE),
        withTiming(10, ANIMATION_CONFIG.TIMING_SHAKE),
        withTiming(0, ANIMATION_CONFIG.TIMING_SHAKE)
      );
    } else {
      shakeAnim.value = withTiming(0, ANIMATION_CONFIG.TIMING_FAST);
    }
  }, [error, shakeAnim]);

  // Optimized change handler with useCallback
  const handleChange = useCallback((text: string) => {
    const cleanText = text.replace(/\D/g, "").slice(0, length);

    // Provide haptic feedback when adding digits (not removing)
    if (cleanText.length > value.length && Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onChange(cleanText);
  }, [length, onChange, value.length]);

  // Memoize animated style for the container
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnim.value }],
  }));

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.inputContainer, containerAnimatedStyle]}
        pointerEvents="none"
      >
        {Array.from({ length }, (_, i) => (
          <OtpDigitBox
            // biome-ignore lint/suspicious/noArrayIndexKey: order is fixed
            key={`otp-${i}`}
            index={i}
            digit={digits[i]}
            isActive={i === value.length && isFocused}
            isFilled={i < value.length}
            error={error}
          />
        ))}
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

interface OtpDigitBoxProps {
  index: number;
  digit?: string;
  isActive: boolean;
  isFilled: boolean;
  error: boolean;
}

function OtpDigitBox({
  digit,
  isActive,
  isFilled,
  error,
}: OtpDigitBoxProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.3);

  // Handle scale and opacity animations when digit is filled
  useEffect(() => {
    if (isFilled) {
      // More elegant scale animation
      scale.value = withSequence(
        withSpring(1.1, ANIMATION_CONFIG.SPRING),
        withSpring(1, ANIMATION_CONFIG.SPRING)
      );
      opacity.value = withTiming(1, ANIMATION_CONFIG.TIMING_FAST);
    } else {
      scale.value = withSpring(1, ANIMATION_CONFIG.SPRING);
      opacity.value = withTiming(0.3, ANIMATION_CONFIG.TIMING_FAST);
    }
  }, [isFilled, scale, opacity]);

  // Handle active state opacity
  useEffect(() => {
    if (isActive && !isFilled) {
      opacity.value = withTiming(0.6, ANIMATION_CONFIG.TIMING_FAST);
    } else if (!isFilled) {
      opacity.value = withTiming(0.3, ANIMATION_CONFIG.TIMING_FAST);
    }
  }, [isActive, isFilled, opacity]);

  // Memoize animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Memoize border and background colors
  const borderStyle = useMemo(() => {
    if (error) return styles.errorBorder;
    if (isActive) return styles.activeBorder;
    if (isFilled) return styles.filledBorder;
    return styles.defaultBorder;
  }, [error, isActive, isFilled]);

  const backgroundStyle = useMemo(() => {
    if (error) return styles.errorBackground;
    if (isActive) return styles.activeBackground;
    return styles.defaultBackground;
  }, [error, isActive]);

  return (
    <Animated.View
      style={[
        styles.digitContainer,
        borderStyle,
        backgroundStyle,
        animatedStyle,
      ]}
    >
      <View style={styles.digitInnerContainer}>
        {digit ? (
          <ThemedText style={styles.digit}>{digit}</ThemedText>
        ) : isActive ? (
          <Animated.View style={styles.cursorContainer}>
            <Animated.View style={styles.cursor} />
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: "100%",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    zIndex: 1,
  },
  digitContainer: {
    width: DIGIT_SIZE,
    height: DIGIT_SIZE,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  defaultBorder: {
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  activeBorder: {
    borderColor: "#0A84FF",
  },
  filledBorder: {
    borderColor: "rgba(255, 255, 255, 0.6)",
  },
  errorBorder: {
    borderColor: "#FF453A",
  },
  defaultBackground: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  activeBackground: {
    backgroundColor: "rgba(10, 132, 255, 0.1)",
  },
  errorBackground: {
    backgroundColor: "rgba(255, 69, 58, 0.1)",
  },
  digitInnerContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  digit: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -1,
  },
  cursorContainer: {
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  cursor: {
    width: 3,
    height: 28,
    backgroundColor: "#0A84FF",
    borderRadius: 2,
  },
  hiddenInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    zIndex: 0,
  },
});