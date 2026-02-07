import { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";

import { ThemedText } from "../themed-text";
import { Fonts } from "@/constants/theme";

const AnimatedView = Animated.View;

export function IosTextField({
  label,
  helperText,
  errorText,
  containerStyle,
  showCharacterCount,
  maxLength,
  ...props
}: TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: object;
  showCharacterCount?: boolean;
  maxLength?: number;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isFocused, setIsFocused] = useState(false);
  const borderScale = useSharedValue(0);

  const bgColor = isDark ? "rgba(118, 118, 128, 0.12)" : "#F2F2F7";
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const placeholderColor = isDark ? "#636366" : "#8E8E93";
  const labelColor = isDark ? "#98989F" : "#6E6E73";
  const focusBorderColor = isDark ? "#0A84FF" : "#007AFF";

  const animatedBorderStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: borderScale.value }],
    opacity: borderScale.value,
  }));

  const handleFocus: NonNullable<TextInputProps["onFocus"]> = (e) => {
    setIsFocused(true);
    borderScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    props.onFocus?.(e);
  };

  const handleBlur: NonNullable<TextInputProps["onBlur"]> = (e) => {
    setIsFocused(false);
    borderScale.value = withSpring(0, { damping: 15, stiffness: 300 });
    props.onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <ThemedText style={[styles.label, { color: labelColor }]}>{label}</ThemedText>}
      <View style={styles.inputWrapper}>
        <TextInput
          placeholderTextColor={placeholderColor}
          selectionColor={focusBorderColor}
          {...props}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            props.multiline ? styles.multilineInput : styles.input,
            {
              backgroundColor: bgColor,
              color: textColor,
            },
            isFocused && {
              backgroundColor: isDark ? "rgba(118, 118, 128, 0.18)" : "#E8E8ED",
            },
          ]}
        />
        <AnimatedView
          style={[styles.focusBorder, { backgroundColor: focusBorderColor }, animatedBorderStyle]}
        />
      </View>
      {errorText && (
        <ThemedText style={[styles.helperText, styles.errorText]}>{errorText}</ThemedText>
      )}
      {!errorText && helperText && (
        <ThemedText style={[styles.helperText, { color: labelColor }]}>{helperText}</ThemedText>
      )}
      {showCharacterCount && (
        <View style={styles.characterCountContainer}>
          <ThemedText style={[styles.characterCount, { color: labelColor }]}>
            {props.value?.length || 0}{maxLength ? `/${maxLength}` : ''}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    marginBottom: 4,
  },
  inputWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 13,
  },
  input: {
    height: 48,
    borderRadius: 13,
    paddingHorizontal: 12,
    fontFamily: Fonts.regular,
  },
  multilineInput: {
    borderRadius: 13,
    paddingHorizontal: 12,
    fontFamily: Fonts.regular,
    minHeight: 48,
    textAlignVertical: 'top',
  },
  focusBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  helperText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
  },
  errorText: {
    color: "#FF3B30",
  },
  characterCountContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    fontFamily: Fonts.regular,
  },
});
