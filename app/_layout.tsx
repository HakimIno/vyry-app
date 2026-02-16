import "@/lib/polyfills";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Redirect, Stack, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import "react-native-reanimated";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/features/auth/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { wsService } from "@/services/websocket";
import { OutboxService } from "@/services/outbox";
import { BackgroundChatService } from "@/services/background-chat";
import { RealmManager } from "@/features/chat/realm";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Prevent splash from auto-hiding until we're ready
SplashScreen.preventAutoHideAsync();

import { queryClient } from "@/lib/react-query";
export { queryClient };


/**
 * Declarative auth guard - returns Redirect component or children
 * No useEffect, no refs, no imperative navigation
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  // Initialize Services
  useEffect(() => {
    OutboxService.getInstance();
    BackgroundChatService.getInstance().init();
  }, []);

  // Handle WebSocket connection
  useEffect(() => {
    if (state.status === "signedIn") {
      wsService.connect();
    } else {
      wsService.disconnect();
    }

    return () => {
      // Optional: disconnect on unmount, but mostly we want it to persist while app is open
      // unless signed out. AuthGuard unmounting usually means nav change, but we are at root.
    };
  }, [state.status]);

  // Reconnect WebSocket + flush outbox immediately when app comes to foreground
  useEffect(() => {
    if (state.status !== "signedIn") return;

    const { AppState } = require("react-native");
    const sub = AppState.addEventListener("change", (nextState: string) => {
      if (nextState === "active") {
        wsService.ensureConnected();
        // Flush outbox after a short delay to give WS time to connect
        setTimeout(() => {
          OutboxService.getInstance().processQueue();
        }, 500);
      }
    });

    return () => sub.remove();
  }, [state.status]);

  const segments = useSegments();
  const inAuthGroup = segments[0] === "(auth)";
  const currentRoute = segments[segments.length - 1] || segments[0];

  // Still loading - render nothing (splash screen is visible)
  if (state.status === "loading") {
    return null;
  }

  // Signed out - must be in auth flow
  if (state.status === "signedOut") {
    if (!inAuthGroup) {
      return <Redirect href="/(auth)/phone" />;
    }
    // Allow phone/otp flow
    return <>{children}</>;
  }

  // Signed in - determine required destination
  const requiredSetup = state.requiresProfileSetup
    ? "profile"
    : state.requiresPinSetup
      ? "pin-setup"
      : state.requiresPinVerify
        ? "pin-verify"
        : null;


  if (requiredSetup) {
    // Need to complete setup - redirect if not on correct page
    if (currentRoute !== requiredSetup) {
      if (__DEV__) {
        console.log("[AuthGuard] Redirecting to:", requiredSetup);
      }
      return <Redirect href={`/(auth)/${requiredSetup}` as const} />;
    }
    return <>{children}</>;
  }

  // All setup complete - should be in tabs
  if (inAuthGroup) {
    if (__DEV__) {
      console.log("[AuthGuard] All setup complete, redirecting to tabs");
    }
    return <Redirect href="/(tabs)" />;
  }



  return <>{children}</>;
}

function RootLayoutContent() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={theme}>
      <AuthProvider>
        <AuthGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "default",
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
  const [dbInitialized, setDbInitialized] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    LINESeedSansTH_Rg: require("../assets/font/LINESeedSansTH_A_Rg.ttf"),
    LINESeedSansTH_Th: require("../assets/font/LINESeedSansTH_A_Th.ttf"),
    LINESeedSansTH_Bd: require("../assets/font/LINESeedSansTH_A_Bd.ttf"),
    LINESeedSansTH_XBd: require("../assets/font/LINESeedSansTH_A_XBd.ttf"),
    LINESeedSansTH_He: require("../assets/font/LINESeedSansTH_A_He.ttf"),
  });

  useEffect(() => {
    RealmManager.init()
      .then(() => setDbInitialized(true))
      .catch((e: unknown) => console.error("Failed to init Realm", e));
  }, []);

  useEffect(() => {
    // Hide splash only when fonts AND DB are ready
    if ((fontsLoaded || fontError) && dbInitialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, dbInitialized]);

  // Wait for fonts & DB before rendering anything
  if ((!fontsLoaded && !fontError) || !dbInitialized) {
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
