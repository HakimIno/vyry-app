import { Stack } from 'expo-router';
import React, { useMemo } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/features/auth/auth-context';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { state } = useAuth();

  // Calculate initial route - only set when state is ready (not loading)
  const initialRouteName = useMemo(() => {
    // Wait for bootstrap to complete
    if (state.status === 'loading') {
      return 'phone'; // Default during loading
    }
    
    if (state.status === 'signedIn') {
      if (state.requiresProfileSetup) return 'profile';
      if (state.requiresPinSetup) return 'pin-setup';
      if (state.requiresPinVerify) return 'pin-verify';
    }
    
    return 'phone'; // Default for signedOut
  }, [state]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? '#000000' : '#FAFBFC',
        },
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        freezeOnBlur: true,
        animationTypeForReplace: 'push',
      }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen 
        name="index" 
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="phone" 
        options={{ gestureEnabled: true }}
      />
      <Stack.Screen 
        name="otp" 
        options={{ gestureEnabled: true }}
      />
      <Stack.Screen 
        name="profile" 
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="pin-setup" 
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen 
        name="pin-verify" 
        options={{ gestureEnabled: false }}
      />
    </Stack>
  );
}
