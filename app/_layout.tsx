import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '@/features/auth/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { useFonts } from '@expo-google-fonts/roboto';
import {
  Roboto_100Thin,
  Roboto_300Light,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Prevent splash from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

export const queryClient = new QueryClient();

/**
 * Declarative auth guard - returns Redirect component or children
 * No useEffect, no refs, no imperative navigation
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const segments = useSegments();

  const inAuthGroup = segments[0] === '(auth)';
  const currentRoute = segments[segments.length - 1] || segments[0];

  // Still loading - render nothing (splash screen is visible)
  if (state.status === 'loading') {
    return null;
  }

  // Signed out - must be in auth flow
  if (state.status === 'signedOut') {
    if (!inAuthGroup) {
      return <Redirect href="/(auth)/phone" />;
    }
    // Allow phone/otp flow
    return <>{children}</>;
  }

  // Signed in - determine required destination
  const requiredSetup = state.requiresProfileSetup
    ? 'profile'
    : state.requiresPinSetup
      ? 'pin-setup'
      : state.requiresPinVerify
        ? 'pin-verify'
        : null;

  if (__DEV__) {
    console.log('[AuthGuard] State:', {
      status: state.status,
      requiresProfileSetup: state.requiresProfileSetup,
      requiresPinSetup: state.requiresPinSetup,
      requiresPinVerify: state.requiresPinVerify,
      requiredSetup,
      currentRoute,
      inAuthGroup,
    });
  }

  if (requiredSetup) {
    // Need to complete setup - redirect if not on correct page
    if (currentRoute !== requiredSetup) {
      if (__DEV__) {
        console.log('[AuthGuard] Redirecting to:', requiredSetup);
      }
      return <Redirect href={`/(auth)/${requiredSetup}` as const} />;
    }
    return <>{children}</>;
  }

  // All setup complete - should be in tabs
  if (inAuthGroup) {
    if (__DEV__) {
      console.log('[AuthGuard] All setup complete, redirecting to tabs');
    }
    return <Redirect href="/(tabs)" />;
  }

  return <>{children}</>;
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'default',
              animationDuration: 200,
              freezeOnBlur: true,
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </AuthGuard>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Roboto_400Regular,
    Roboto_700Bold,
    Roboto_500Medium,
    Roboto_300Light,
    Roboto_100Thin,
  });

  useEffect(() => {
    // Hide splash only when fonts are ready
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Wait for fonts before rendering anything
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutContent />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
