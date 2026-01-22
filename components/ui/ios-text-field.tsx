import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { ThemedText } from '../themed-text';

const AnimatedView = Animated.View;

export function IosTextField({
  label,
  helperText,
  errorText,
  containerStyle,
  ...props
}: TextInputProps & {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: object;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [isFocused, setIsFocused] = useState(false);
  const borderScale = useSharedValue(0);

  const bgColor = isDark ? 'rgba(118, 118, 128, 0.12)' : '#F2F2F7';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const placeholderColor = isDark ? '#636366' : '#8E8E93';
  const labelColor = isDark ? '#98989F' : '#6E6E73';
  const focusBorderColor = isDark ? '#0A84FF' : '#007AFF';

  const animatedBorderStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: borderScale.value }],
    opacity: borderScale.value,
  }));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    borderScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    borderScale.value = withSpring(0, { damping: 15, stiffness: 300 });
    props.onBlur?.(e);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <ThemedText style={[styles.label, { color: labelColor }]}>
          {label}
        </ThemedText>
      )}
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
              backgroundColor: isDark ? 'rgba(118, 118, 128, 0.18)' : '#E8E8ED',
            },
            props.style,
          ]}
        />
        <AnimatedView
          style={[
            styles.focusBorder,
            { backgroundColor: focusBorderColor },
            animatedBorderStyle,
          ]}
        />
      </View>
      {errorText && (
        <ThemedText style={[styles.helperText, styles.errorText]}>
          {errorText}
        </ThemedText>
      )}
      {!errorText && helperText && (
        <ThemedText style={[styles.helperText, { color: labelColor }]}>
          {helperText}
        </ThemedText>
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
    fontWeight: '500',
    letterSpacing: -0.1,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontFamily: 'Roboto_500Medium',
  },
  inputWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  input: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    letterSpacing: -0.2,
    fontFamily: 'Roboto_400Regular',
  },
  multilineInput: {
    minHeight: 100,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 17,
    letterSpacing: -0.2,
    fontFamily: 'Roboto_400Regular',
    textAlignVertical: 'top',
  },
  focusBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  errorText: {
    color: '#FF3B30',
  },
});
