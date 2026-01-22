import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { ThemedText } from '../themed-text';

export function IosScreen({
  title,
  subtitle,
  children,
  style,
  showBackgroundDecor = false,
}: ViewProps & {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showBackgroundDecor?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark, style]}>
      {/* Optional background decoration */}
      {showBackgroundDecor && (
        <>
          <View style={[styles.decorCircle, styles.decor1, isDark && styles.decor1Dark]} />
          <View style={[styles.decorCircle, styles.decor2, isDark && styles.decor2Dark]} />
        </>
      )}

      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        {(title || subtitle) && (
          <Animated.View entering={FadeInDown.duration(600).delay(100).springify()} style={styles.header}>
            {!!title && (
              <ThemedText
                style={[
                  styles.title,
                  { fontFamily: Fonts.rounded },
                  isDark && styles.titleDark,
                ]}
              >
                {title}
              </ThemedText>
            )}
            {!!subtitle && (
              <ThemedText style={[styles.subtitle, isDark && styles.subtitleDark]}>
                {subtitle}
              </ThemedText>
            )}
          </Animated.View>
        )}
        <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.body}>
          {children}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFBFC',
    overflow: 'hidden',
  },
  containerDark: {
    backgroundColor: '#000000',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
  },
  decor1: {
    width: 300,
    height: 300,
    top: -80,
    right: -80,
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
  },
  decor1Dark: {
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
  },
  decor2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -60,
    backgroundColor: 'rgba(88, 86, 214, 0.06)',
  },
  decor2Dark: {
    backgroundColor: 'rgba(94, 92, 230, 0.10)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#1C1C1E',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 17,
    color: '#6E6E73',
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  subtitleDark: {
    color: '#98989F',
  },
  body: {
    flex: 1,
  },
});
