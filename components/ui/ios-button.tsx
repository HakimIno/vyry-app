import * as Haptics from 'expo-haptics';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

import { ThemedText } from '../themed-text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function   IosButton({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  size = 'large',
  fullWidth = false,
  destructive = false,
  style,
  ...props
}: PressableProps & {
  title: string;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'text' | 'danger' | 'pill' | 'outline';
  size?: 'large' | 'medium' | 'small';
  fullWidth?: boolean;
  destructive?: boolean;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scale = useSharedValue(1);
  const pressOpacity = useSharedValue(1);

  const colors = getColors(variant, isDark, destructive);
  const dimensions = getDimensions(size);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: pressOpacity.value,
  }));

  const handlePressIn = () => {
    pressOpacity.value = withSpring(0.96, {
      mass: 0.5,
      damping: 22,
      stiffness: 320,
      overshootClamping: true,
    });
    scale.value = withSpring(0.985, {
      mass: 0.5,
      damping: 22,
      stiffness: 320,
      overshootClamping: true,
    });
  };

  const handlePressOut = () => {
    pressOpacity.value = withSpring(1, {
      mass: 0.6,
      damping: 24,
      stiffness: 260,
      overshootClamping: true,
    });
    scale.value = withSpring(1, {
      mass: 0.6,
      damping: 24,
      stiffness: 260,
      overshootClamping: true,
    });
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={(e) => {
        if (Platform.OS !== 'web') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPress?.(e);
      }}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          backgroundColor: colors.bg,
          height: dimensions.height,
          paddingHorizontal: dimensions.paddingX,
          borderRadius: dimensions.borderRadius,
          opacity: disabled || loading ? 0.5 : 1,
        },
        fullWidth && styles.fullWidth,
        variant === 'primary' && {
          shadowColor: isDark ? '#0A84FF' : '#007AFF',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 6,
        },
        variant === 'pill' && {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.25 : 0.15,
          shadowRadius: 18,
          elevation: 8,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          borderRadius: dimensions.height / 2,
        },
        variant === 'outline' && {
          borderWidth: 1,
          borderColor: colors.border,
        },
        animatedStyle,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} size="small" />
      ) : (
        <ThemedText
          style={[
            styles.text,
            {
              color: colors.fg,
              fontSize: dimensions.fontSize,
              fontFamily: 'Roboto_500Medium',
            },
          ]}
        >
          {title}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
}

function getColors(variant: string, isDark: boolean, destructive = false) {
  switch (variant) {
    case 'primary':
      return {
        bg: isDark ? '#FFFFFF' : '#000000',
        fg: isDark ? '#111111' : '#FFFFFF',
      };
    case 'secondary':
      return {
        bg: isDark ? 'rgba(118, 118, 128, 0.24)' : 'rgba(118, 118, 128, 0.12)',
        fg: isDark ? '#FFFFFF' : '#1C1C1E',
      };
    case 'text':
      return {
        bg: 'transparent',
        fg: destructive ? (isDark ? '#FF453A' : '#FF3B30') : (isDark ? '#0A84FF' : '#007AFF'),
      };
    case 'danger':
      return {
        bg: isDark ? '#FF453A' : '#FF3B30',
        fg: '#FFFFFF',
      };
    case 'pill':
      return {
        bg: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
        fg: isDark ? '#F2F2F7' : '#1C1C1E',
      };
    case 'outline':
      return {
        bg: 'transparent',
        fg: destructive ? (isDark ? '#FF453A' : '#FF3B30') : (isDark ? '#0A84FF' : '#007AFF'),
        border: destructive ? (isDark ? '#FF453A' : '#FF3B30') : (isDark ? '#0A84FF' : '#007AFF'),
      };
    default:
      return {
        bg: isDark ? '#FFFFFF' : '#000000',
        fg: isDark ? '#111111' : '#FFFFFF',
      };
  }
}

function getDimensions(size: string) {
  switch (size) {
    case 'large':
      return {
        height: 44,
        paddingX: 24,
        borderRadius: 140,
        fontSize: 17,
      };
    case 'medium':
      return {
        height: 40,
        paddingX: 20,
        borderRadius: 120,
        fontSize: 16,
      };
    case 'small':
      return {
        height: 36,
        paddingX: 16,
        borderRadius: 100,
        fontSize: 15,
      };
    default:
      return {
        height: 54,
        paddingX: 24,
        borderRadius: 140,
        fontSize: 17,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  text: {
    letterSpacing: -0.3,
  },
});
