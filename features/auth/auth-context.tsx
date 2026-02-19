import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { queryClient } from "@/lib/react-query";
import { clearAuthenticationFailureHandler, setAuthenticationFailureHandler } from "@/lib/http";
import { SecureKV } from "@/lib/secure-store";
import { uuidv4 } from "@/lib/uuid";
import { useProfileStore } from "@/stores/profile-store";
import { SignalService } from "@/services/signal";
import { MessageStorage } from "@/features/chat/storage";

import type { VerifyOtpResponse } from "./auth-types";
import { useCheckPinStatus, useSkipPinSetup } from "./auth-hooks";

type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | {
    status: "signedIn";
    accessToken: string;
    refreshToken: string;
    requiresProfileSetup: boolean;
    requiresPinSetup: boolean;
    requiresPinVerify: boolean;
    hasPin: boolean;
  };

type AuthContextValue = {
  state: AuthState;
  deviceUuid: string | null;
  bootstrap: () => Promise<void>;
  setSessionFromVerifyOtp: (resp: VerifyOtpResponse) => Promise<void>;
  completeProfileSetup: () => Promise<void>;
  completePinSetup: () => Promise<void>;
  skipPinSetup: () => Promise<void>;
  completePinVerify: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Constants
const AUTH_KEYS = {
  ACCESS_TOKEN: "auth.accessToken",
  REFRESH_TOKEN: "auth.refreshToken",
  REQUIRES_PROFILE_SETUP: "auth.requiresProfileSetup",
  REQUIRES_PIN_SETUP: "auth.requiresPinSetup",
  REQUIRES_PIN_VERIFY: "auth.requiresPinVerify",
  HAS_PIN: "auth.hasPin",
  DEVICE_UUID: "device.uuid",
} as const;

// Helper functions
const parseBool = (val: string | null): boolean => val === "true";

const shouldPreserveState = (state: AuthState): boolean => {
  return state.status === "signedIn" && !state.requiresPinVerify;
};

const isSignedIn = (state: AuthState): state is Extract<AuthState, { status: "signedIn" }> => {
  return state.status === "signedIn";
};

// Auth data management
// Auth data management
const AuthStorage = {
  async getAll() {
    const [
      accessToken,
      refreshToken,
      deviceUuid,
      requiresProfileSetup,
      requiresPinSetup,
      requiresPinVerify,
      hasPin,
    ] = await Promise.all([
      SecureKV.get(AUTH_KEYS.ACCESS_TOKEN),
      SecureKV.get(AUTH_KEYS.REFRESH_TOKEN),
      SecureKV.get(AUTH_KEYS.DEVICE_UUID),
      SecureKV.get(AUTH_KEYS.REQUIRES_PROFILE_SETUP),
      SecureKV.get(AUTH_KEYS.REQUIRES_PIN_SETUP),
      SecureKV.get(AUTH_KEYS.REQUIRES_PIN_VERIFY),
      SecureKV.get(AUTH_KEYS.HAS_PIN),
    ]);

    return {
      accessToken,
      refreshToken,
      deviceUuid,
      requiresProfileSetup: parseBool(requiresProfileSetup),
      requiresPinSetup: parseBool(requiresPinSetup),
      requiresPinVerify: parseBool(requiresPinVerify),
      hasPin: parseBool(hasPin),
    };
  },

  async setSession(data: {
    accessToken: string;
    refreshToken: string;
    requiresProfileSetup: boolean;
    requiresPinSetup: boolean;
    requiresPinVerify: boolean;
    hasPin?: boolean;
  }) {
    await Promise.all([
      SecureKV.set(AUTH_KEYS.ACCESS_TOKEN, data.accessToken),
      SecureKV.set(AUTH_KEYS.REFRESH_TOKEN, data.refreshToken),
      SecureKV.set(AUTH_KEYS.REQUIRES_PROFILE_SETUP, String(data.requiresProfileSetup)),
      SecureKV.set(AUTH_KEYS.REQUIRES_PIN_SETUP, String(data.requiresPinSetup)),
      SecureKV.set(AUTH_KEYS.REQUIRES_PIN_VERIFY, String(data.requiresPinVerify)),
      SecureKV.set(AUTH_KEYS.HAS_PIN, String(data.hasPin ?? true)),
    ]);
  },

  async updateFlags(
    updates: Partial<{
      requiresProfileSetup: boolean;
      requiresPinSetup: boolean;
      requiresPinVerify: boolean;
      hasPin: boolean;
    }>
  ) {
    const promises: Promise<void>[] = [];

    if (updates.requiresProfileSetup !== undefined) {
      promises.push(
        SecureKV.set(AUTH_KEYS.REQUIRES_PROFILE_SETUP, String(updates.requiresProfileSetup))
      );
    }
    if (updates.requiresPinSetup !== undefined) {
      promises.push(SecureKV.set(AUTH_KEYS.REQUIRES_PIN_SETUP, String(updates.requiresPinSetup)));
    }
    if (updates.requiresPinVerify !== undefined) {
      promises.push(SecureKV.set(AUTH_KEYS.REQUIRES_PIN_VERIFY, String(updates.requiresPinVerify)));
    }
    if (updates.hasPin !== undefined) {
      promises.push(SecureKV.set(AUTH_KEYS.HAS_PIN, String(updates.hasPin)));
    }

    await Promise.all(promises);
  },

  async clearSession() {
    await Promise.all([
      SecureKV.del(AUTH_KEYS.ACCESS_TOKEN),
      SecureKV.del(AUTH_KEYS.REFRESH_TOKEN),
      SecureKV.del(AUTH_KEYS.REQUIRES_PROFILE_SETUP),
      SecureKV.del(AUTH_KEYS.REQUIRES_PIN_SETUP),
      SecureKV.del(AUTH_KEYS.REQUIRES_PIN_VERIFY),
      SecureKV.del(AUTH_KEYS.HAS_PIN),
    ]);
  },

  async ensureDeviceUuid(): Promise<string> {
    let uuid = await SecureKV.get(AUTH_KEYS.DEVICE_UUID);
    if (!uuid) {
      uuid = uuidv4();
      await SecureKV.set(AUTH_KEYS.DEVICE_UUID, uuid);
    }
    return uuid;
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const bootstrapRunRef = useRef(false);
  const stateSnapshotRef = useRef<AuthState>({ status: "loading" });
  const checkPinStatusMutation = useCheckPinStatus();
  const skipPinSetupMutation = useSkipPinSetup();

  // Update snapshot whenever state changes
  useEffect(() => {
    stateSnapshotRef.current = state;

    if (state.status === "signedIn") {
      // Get user ID from profile store or decode token if needed.
      // For now, let's try to get it from profile store if available, or just rely on local keys if not?
      // Wait, we need userId for the fix.
      // We can get it from the state if we add it to AuthState, OR we can fetch profile here.
      // The most reliable way without changing AuthState much is to fetch profile or decode token.
      // But we have useProfileStore!
      const userProfile = useProfileStore.getState().profile;
      const userId = userProfile?.user_id;

      SignalService.getInstance()
        .ensureKeys(false, userId ? { userId } : undefined)
        .catch((e) => {
          console.error("[Auth] Failed to ensure Signal keys:", e);
        });
    }
  }, [state]);

  const bootstrap = useCallback(async () => {
    // Prevent bootstrap from resetting verified state
    if (shouldPreserveState(stateSnapshotRef.current)) {
      if (__DEV__) {
        console.log("[Auth] Bootstrap blocked: PIN already verified");
      }
      bootstrapRunRef.current = true;
      return;
    }

    // Only run once
    if (bootstrapRunRef.current) {
      if (__DEV__) {
        console.log("[Auth] Bootstrap already run, skipping");
      }
      return;
    }

    bootstrapRunRef.current = true;

    try {
      // Load all persisted data
      const stored = await AuthStorage.getAll();
      const uuid = await AuthStorage.ensureDeviceUuid();
      setDeviceUuid(uuid);

      // Restore session if tokens exist
      if (stored.accessToken && stored.refreshToken) {
        // Check PIN status from API
        try {
          const pinStatus = await checkPinStatusMutation.mutateAsync();

          setState((current) => {
            // Never override verified state
            if (shouldPreserveState(current)) {
              if (__DEV__) {
                console.log("[Auth] Bootstrap: Preserving verified state");
              }
              return current;
            }

            // Initial bootstrap or signed out
            if (current.status === "loading" || current.status === "signedOut") {
              // Ensure we have tokens before setting status to signedIn
              if (!stored.accessToken || !stored.refreshToken) {
                return { status: "signedOut" };
              }

              return {
                status: "signedIn",
                accessToken: stored.accessToken,
                refreshToken: stored.refreshToken,
                requiresProfileSetup: stored.requiresProfileSetup,
                requiresPinSetup: stored.requiresPinSetup,
                requiresPinVerify: pinStatus.has_pin ? stored.requiresPinVerify : false,
                hasPin: pinStatus.has_pin,
              };
            }

            // Update tokens if changed
            if (isSignedIn(current) && current.accessToken !== stored.accessToken) {
              return {
                ...current,
                accessToken: stored.accessToken ?? current.accessToken,
                refreshToken: stored.refreshToken ?? current.refreshToken,
                requiresProfileSetup: stored.requiresProfileSetup,
                requiresPinSetup: stored.requiresPinSetup,
                requiresPinVerify: pinStatus.has_pin ? stored.requiresPinVerify : false,
                hasPin: pinStatus.has_pin,
              };
            }

            return current;
          });
        } catch (error) {
          if (__DEV__) {
            console.log("[Auth] Error checking PIN status during bootstrap:", error);
          }
          // If we can't check PIN status, use stored values with hasPin defaulting to false
          setState((current) => {
            // Never override verified state
            if (shouldPreserveState(current)) {
              if (__DEV__) {
                console.log("[Auth] Bootstrap: Preserving verified state");
              }
              return current;
            }

            // Initial bootstrap or signed out
            if (current.status === "loading" || current.status === "signedOut") {
              if (!stored.accessToken || !stored.refreshToken) {
                return { status: "signedOut" };
              }

              return {
                status: "signedIn",
                accessToken: stored.accessToken,
                refreshToken: stored.refreshToken,
                requiresProfileSetup: stored.requiresProfileSetup,
                requiresPinSetup: stored.requiresPinSetup,
                requiresPinVerify: false, // Default to false when we can't verify
                hasPin: false, // Default to false when we can't verify
              };
            }

            // Update tokens if changed
            if (isSignedIn(current) && current.accessToken !== stored.accessToken) {
              return {
                ...current,
                accessToken: stored.accessToken ?? current.accessToken,
                refreshToken: stored.refreshToken ?? current.refreshToken,
                requiresProfileSetup: stored.requiresProfileSetup,
                requiresPinSetup: stored.requiresPinSetup,
                requiresPinVerify: false, // Default to false when we can't verify
                hasPin: false, // Default to false when we can't verify
              };
            }

            return current;
          });
        }
      } else {
        setState((current) => (current.status === "signedOut" ? current : { status: "signedOut" }));
      }
    } catch (error) {
      if (__DEV__) {
        console.error("[Auth] Bootstrap error:", error);
      }
      setState({ status: "signedOut" });
    }
  }, [checkPinStatusMutation]);

  // Bootstrap on mount
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const setSessionFromVerifyOtp = useCallback(async (resp: VerifyOtpResponse) => {
    const sessionData = {
      accessToken: resp.access_token,
      refreshToken: resp.refresh_token,
      requiresProfileSetup: resp.requires_profile_setup,
      requiresPinSetup: resp.requires_profile_setup ? true : resp.is_new_user,
      requiresPinVerify: resp.requires_pin && !resp.requires_profile_setup,
      hasPin: resp.requires_pin && !resp.is_new_user, // Only has PIN if it's required and not a new user
    };

    await AuthStorage.setSession(sessionData);

    setState({
      status: "signedIn",
      ...sessionData,
    });

  }, []);

  const completeProfileSetup = useCallback(async () => {
    await AuthStorage.updateFlags({
      requiresProfileSetup: false,
      requiresPinSetup: true,
    });

    setState((s) =>
      isSignedIn(s) ? { ...s, requiresProfileSetup: false, requiresPinSetup: true } : s
    );
  }, []);

  const completePinSetup = useCallback(async () => {
    await AuthStorage.updateFlags({
      requiresPinSetup: false,
      requiresPinVerify: false,
    });

    setState((s) =>
      isSignedIn(s) ? { ...s, requiresPinSetup: false, requiresPinVerify: false, hasPin: true } : s
    );
  }, []);

  const skipPinSetup = useCallback(async () => {
    try {
      // Call API to skip PIN setup
      await skipPinSetupMutation.mutateAsync();

      // Update local state
      await AuthStorage.updateFlags({
        requiresPinSetup: false,
        requiresPinVerify: false,
      });

      setState((s) =>
        isSignedIn(s) ? { ...s, requiresPinSetup: false, requiresPinVerify: false, hasPin: false } : s
      );
    } catch (error) {
      if (__DEV__) {
        console.log("[Auth] Error skipping PIN setup:", error);
      }
      throw error;
    }
  }, [skipPinSetupMutation]);

  const completePinVerify = useCallback(async () => {
    // Update storage to persist verification during current session
    // We'll reset requiresPinVerify when app goes to background
    await AuthStorage.updateFlags({
      requiresPinVerify: false,
    });

    setState((s) => (isSignedIn(s) ? { ...s, requiresPinVerify: false } : s));
  }, []);

  const signOut = useCallback(async () => {
    try {
      // 1. Clear Auth Session
      await AuthStorage.clearSession();

      // 2. Clear Chat Data (Messages & Signal Keys)
      // Important to do this to prevent next user from seeing old messages or using wrong keys
      MessageStorage.clearAll();
      await SignalService.getInstance().clear();

      // 3. Application State Cleanup
      bootstrapRunRef.current = false;
      await useProfileStore.getState().reset();
      queryClient.clear();

      setState({ status: "signedOut" });
    } catch (e) {
      console.error("[Auth] Error during sign out cleanup:", e);
      // Force signout state anyway
      setState({ status: "signedOut" });
    }
  }, []);

  // Handle app state changes
  useEffect(() => {
    let appState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const isBackgrounding =
        appState === "active" && (nextAppState === "background" || nextAppState === "inactive");
      const isForegrounding = appState === "background" && nextAppState === "active";

      if (__DEV__) {
        if (isBackgrounding) {
          console.log("[Auth] App backgrounding");
        } else if (isForegrounding) {
          console.log("[Auth] App foregrounding");
        }
      }

      // When app goes to background, check PIN status on next foreground
      if (isBackgrounding) {
        // Don't update state immediately, we'll check PIN status when app comes to foreground
        if (__DEV__) {
          console.log("[Auth] App backgrounding, will check PIN status on foreground");
        }
      }

      // When app comes to foreground, check if user has a PIN
      if (isForegrounding) {
        const currentState = stateSnapshotRef.current;
        if (isSignedIn(currentState) && !currentState.requiresPinVerify) {
          try {
            const pinStatus = await checkPinStatusMutation.mutateAsync();
            if (pinStatus.has_pin) {
              await AuthStorage.updateFlags({
                requiresPinVerify: true,
              });
              setState((s) => (isSignedIn(s) ? { ...s, requiresPinVerify: true, hasPin: true } : s));
              if (__DEV__) {
                console.log("[Auth] User has PIN, requiring verification");
              }
            } else {
              await AuthStorage.updateFlags({
                requiresPinVerify: false,
                hasPin: false,
              });
              setState((s) => (isSignedIn(s) ? { ...s, requiresPinVerify: false, hasPin: false } : s));
              if (__DEV__) {
                console.log("[Auth] User does not have PIN, skipping verification");
              }
            }
          } catch (error) {
            if (__DEV__) {
              console.log("[Auth] Error checking PIN status:", error);
            }
            // If we can't check PIN status, assume no PIN for better UX
            await AuthStorage.updateFlags({
              requiresPinVerify: false,
              hasPin: false,
            });
            setState((s) => (isSignedIn(s) ? { ...s, requiresPinVerify: false, hasPin: false } : s));
          }
        }
      }

      appState = nextAppState;
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [checkPinStatusMutation]);

  // Handle authentication failures
  useEffect(() => {
    const handleAuthFailure = async () => {
      if (__DEV__) {
        console.log("[Auth] Authentication failed, signing out");
      }
      await signOut();
    };

    setAuthenticationFailureHandler(handleAuthFailure);
    return () => clearAuthenticationFailureHandler();
  }, [signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      deviceUuid,
      bootstrap,
      setSessionFromVerifyOtp,
      completeProfileSetup,
      completePinSetup,
      skipPinSetup,
      completePinVerify,
      signOut,
    }),
    [
      state,
      deviceUuid,
      bootstrap,
      setSessionFromVerifyOtp,
      completeProfileSetup,
      completePinSetup,
      skipPinSetup,
      completePinVerify,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
