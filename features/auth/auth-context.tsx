import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { SecureKV } from '@/lib/secure-store';
import { uuidv4 } from '@/lib/uuid';
import { queryClient } from '@/app/_layout';
import { useProfileStore } from '@/stores/profile-store';
import { setAuthenticationFailureHandler, clearAuthenticationFailureHandler } from '@/lib/http';

import type { VerifyOtpResponse } from './auth-types';

type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | {
    status: 'signedIn';
    accessToken: string;
    refreshToken: string;
    requiresProfileSetup: boolean;
    requiresPinSetup: boolean;
    requiresPinVerify: boolean;
  };

type AuthContextValue = {
  state: AuthState;
  deviceUuid: string | null;
  bootstrap: () => Promise<void>;
  setSessionFromVerifyOtp: (resp: VerifyOtpResponse) => Promise<void>;
  completeProfileSetup: () => Promise<void>;
  completePinSetup: () => Promise<void>;
  completePinVerify: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Constants
const AUTH_KEYS = {
  ACCESS_TOKEN: 'auth.accessToken',
  REFRESH_TOKEN: 'auth.refreshToken',
  REQUIRES_PROFILE_SETUP: 'auth.requiresProfileSetup',
  REQUIRES_PIN_SETUP: 'auth.requiresPinSetup',
  REQUIRES_PIN_VERIFY: 'auth.requiresPinVerify',
  DEVICE_UUID: 'device.uuid',
} as const;

// Helper functions
const parseBool = (val: string | null): boolean => val === 'true';

const shouldPreserveState = (state: AuthState): boolean => {
  return state.status === 'signedIn' && !state.requiresPinVerify;
};

const isSignedIn = (state: AuthState): state is Extract<AuthState, { status: 'signedIn' }> => {
  return state.status === 'signedIn';
};

// Auth data management
class AuthStorage {
  static async getAll() {
    const [
      accessToken,
      refreshToken,
      deviceUuid,
      requiresProfileSetup,
      requiresPinSetup,
      requiresPinVerify,
    ] = await Promise.all([
      SecureKV.get(AUTH_KEYS.ACCESS_TOKEN),
      SecureKV.get(AUTH_KEYS.REFRESH_TOKEN),
      SecureKV.get(AUTH_KEYS.DEVICE_UUID),
      SecureKV.get(AUTH_KEYS.REQUIRES_PROFILE_SETUP),
      SecureKV.get(AUTH_KEYS.REQUIRES_PIN_SETUP),
      SecureKV.get(AUTH_KEYS.REQUIRES_PIN_VERIFY),
    ]);

    return {
      accessToken,
      refreshToken,
      deviceUuid,
      requiresProfileSetup: parseBool(requiresProfileSetup),
      requiresPinSetup: parseBool(requiresPinSetup),
      requiresPinVerify: parseBool(requiresPinVerify),
    };
  }

  static async setSession(data: {
    accessToken: string;
    refreshToken: string;
    requiresProfileSetup: boolean;
    requiresPinSetup: boolean;
    requiresPinVerify: boolean;
  }) {
    await Promise.all([
      SecureKV.set(AUTH_KEYS.ACCESS_TOKEN, data.accessToken),
      SecureKV.set(AUTH_KEYS.REFRESH_TOKEN, data.refreshToken),
      SecureKV.set(AUTH_KEYS.REQUIRES_PROFILE_SETUP, String(data.requiresProfileSetup)),
      SecureKV.set(AUTH_KEYS.REQUIRES_PIN_SETUP, String(data.requiresPinSetup)),
      SecureKV.set(AUTH_KEYS.REQUIRES_PIN_VERIFY, String(data.requiresPinVerify)),
    ]);
  }

  static async updateFlags(updates: Partial<{
    requiresProfileSetup: boolean;
    requiresPinSetup: boolean;
    requiresPinVerify: boolean;
  }>) {
    const promises: Promise<void>[] = [];

    if (updates.requiresProfileSetup !== undefined) {
      promises.push(SecureKV.set(AUTH_KEYS.REQUIRES_PROFILE_SETUP, String(updates.requiresProfileSetup)));
    }
    if (updates.requiresPinSetup !== undefined) {
      promises.push(SecureKV.set(AUTH_KEYS.REQUIRES_PIN_SETUP, String(updates.requiresPinSetup)));
    }
    if (updates.requiresPinVerify !== undefined) {
      promises.push(SecureKV.set(AUTH_KEYS.REQUIRES_PIN_VERIFY, String(updates.requiresPinVerify)));
    }

    await Promise.all(promises);
  }

  static async clearSession() {
    await Promise.all([
      SecureKV.del(AUTH_KEYS.ACCESS_TOKEN),
      SecureKV.del(AUTH_KEYS.REFRESH_TOKEN),
      SecureKV.del(AUTH_KEYS.REQUIRES_PROFILE_SETUP),
      SecureKV.del(AUTH_KEYS.REQUIRES_PIN_SETUP),
      SecureKV.del(AUTH_KEYS.REQUIRES_PIN_VERIFY),
    ]);
  }

  static async ensureDeviceUuid(): Promise<string> {
    let uuid = await SecureKV.get(AUTH_KEYS.DEVICE_UUID);
    if (!uuid) {
      uuid = uuidv4();
      await SecureKV.set(AUTH_KEYS.DEVICE_UUID, uuid);
    }
    return uuid;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const bootstrapRunRef = useRef(false);
  const stateSnapshotRef = useRef<AuthState>({ status: 'loading' });

  // Update snapshot whenever state changes
  useEffect(() => {
    stateSnapshotRef.current = state;
  }, [state]);

  const bootstrap = useCallback(async () => {
    // Prevent bootstrap from resetting verified state
    if (shouldPreserveState(stateSnapshotRef.current)) {
      if (__DEV__) {
        console.log('[Auth] Bootstrap blocked: PIN already verified');
      }
      bootstrapRunRef.current = true;
      return;
    }

    // Only run once
    if (bootstrapRunRef.current) {
      if (__DEV__) {
        console.log('[Auth] Bootstrap already run, skipping');
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
        setState((current) => {
          // Never override verified state
          if (shouldPreserveState(current)) {
            if (__DEV__) {
              console.log('[Auth] Bootstrap: Preserving verified state');
            }
            return current;
          }

          // Initial bootstrap or signed out
          if (current.status === 'loading' || current.status === 'signedOut') {
            return {
              status: 'signedIn',
              accessToken: stored.accessToken!,
              refreshToken: stored.refreshToken!,
              requiresProfileSetup: stored.requiresProfileSetup,
              requiresPinSetup: stored.requiresPinSetup,
              requiresPinVerify: stored.requiresPinVerify,
            };
          }

          // Update tokens if changed
          if (isSignedIn(current) && current.accessToken !== stored.accessToken) {
            return {
              ...current,
              accessToken: stored.accessToken!,
              refreshToken: stored.refreshToken!,
              requiresProfileSetup: stored.requiresProfileSetup,
              requiresPinSetup: stored.requiresPinSetup,
              requiresPinVerify: stored.requiresPinVerify,
            };
          }

          return current;
        });
      } else {
        setState((current) =>
          current.status === 'signedOut' ? current : { status: 'signedOut' }
        );
      }
    } catch (error) {
      if (__DEV__) {
        console.error('[Auth] Bootstrap error:', error);
      }
      setState({ status: 'signedOut' });
    }
  }, []);

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
    };

    await AuthStorage.setSession(sessionData);

    setState({
      status: 'signedIn',
      ...sessionData,
    });
  }, []);

  const completeProfileSetup = useCallback(async () => {
    await AuthStorage.updateFlags({
      requiresProfileSetup: false,
      requiresPinSetup: true,
    });

    setState((s) =>
      isSignedIn(s)
        ? { ...s, requiresProfileSetup: false, requiresPinSetup: true }
        : s
    );
  }, []);

  const completePinSetup = useCallback(async () => {
    await AuthStorage.updateFlags({
      requiresPinSetup: false,
      requiresPinVerify: false,
    });

    setState((s) =>
      isSignedIn(s)
        ? { ...s, requiresPinSetup: false, requiresPinVerify: false }
        : s
    );
  }, []);

  const completePinVerify = useCallback(async () => {
    // Update storage to persist verification during current session
    // We'll reset requiresPinVerify when app goes to background
    await AuthStorage.updateFlags({
      requiresPinVerify: false,
    });

    setState((s) =>
      isSignedIn(s)
        ? { ...s, requiresPinVerify: false }
        : s
    );
  }, []);

  const signOut = useCallback(async () => {
    await AuthStorage.clearSession();

    // Reset bootstrap flag
    bootstrapRunRef.current = false;

    // Clear app data
    await useProfileStore.getState().reset();
    queryClient.clear();

    setState({ status: 'signedOut' });
  }, []);

  // Handle app state changes
  useEffect(() => {
    let appState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const isBackgrounding = appState === 'active' &&
        (nextAppState === 'background' || nextAppState === 'inactive');
      const isForegrounding = appState === 'background' && nextAppState === 'active';

      if (__DEV__) {
        if (isBackgrounding) {
          console.log('[Auth] App backgrounding');
        } else if (isForegrounding) {
          console.log('[Auth] App foregrounding');
        }
      }

      // When app goes to background, require PIN verification on next foreground
      if (isBackgrounding) {
        const currentState = stateSnapshotRef.current;
        if (isSignedIn(currentState) && !currentState.requiresPinVerify) {
          await AuthStorage.updateFlags({
            requiresPinVerify: true,
          });
          setState((s) =>
            isSignedIn(s)
              ? { ...s, requiresPinVerify: true }
              : s
          );
        }
      }

      appState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // Handle authentication failures
  useEffect(() => {
    const handleAuthFailure = async () => {
      if (__DEV__) {
        console.log('[Auth] Authentication failed, signing out');
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
      completePinVerify,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider />');
  return ctx;
}