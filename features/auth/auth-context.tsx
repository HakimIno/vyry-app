import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

// Helper to parse boolean from storage
const parseBool = (val: string | null): boolean => val === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const bootstrapRunRef = React.useRef(false);
  // Store state snapshot to check without triggering re-render
  const stateSnapshotRef = React.useRef<AuthState>({ status: 'loading' });

  // Update snapshot whenever state changes
  useEffect(() => {
    stateSnapshotRef.current = state;
  }, [state]);

  const bootstrap = useCallback(async () => {
    // CRITICAL: Check if PIN is already verified before running bootstrap
    // This prevents bootstrap from resetting state after PIN verification
    const currentState = stateSnapshotRef.current;
    if (currentState.status === 'signedIn' && !currentState.requiresPinVerify) {
      if (__DEV__) {
        console.log('[Auth] Bootstrap: PIN already verified, blocking bootstrap completely');
      }
      bootstrapRunRef.current = true;
      return;
    }

    // Only run bootstrap once
    if (bootstrapRunRef.current) {
      if (__DEV__) {
        console.log('[Auth] Bootstrap: Already run, skipping');
      }
      return;
    }

    bootstrapRunRef.current = true;

    // Fetch all persisted values in parallel
    const [
      accessToken,
      refreshToken,
      storedDeviceUuid,
      requiresProfileSetup,
      requiresPinSetup,
      requiresPinVerify,
    ] = await Promise.all([
      SecureKV.get('auth.accessToken'),
      SecureKV.get('auth.refreshToken'),
      SecureKV.get('device.uuid'),
      SecureKV.get('auth.requiresProfileSetup'),
      SecureKV.get('auth.requiresPinSetup'),
      SecureKV.get('auth.requiresPinVerify'),
    ]);

    // Ensure device UUID exists
    let du = storedDeviceUuid;
    if (!du) {
      du = uuidv4();
      await SecureKV.set('device.uuid', du);
    }
    setDeviceUuid(du);

    // Restore session if tokens exist
    if (accessToken && refreshToken) {
      const needsPinVerify = parseBool(requiresPinVerify);
      
      setState((currentState) => {
        // CRITICAL: If state is already signed in and PIN is verified, NEVER reset it
        // This is the key to preventing the infinite loop
        if (currentState.status === 'signedIn' && !currentState.requiresPinVerify) {
          if (__DEV__) {
            console.log('[Auth] Bootstrap: PIN already verified, preserving state - NOT resetting');
          }
          return currentState;
        }

        // Only set state if it's still loading (initial bootstrap)
        if (currentState.status === 'loading') {
          if (__DEV__) {
            console.log('[Auth] Bootstrap: Initial bootstrap, setting state');
          }
          return {
            status: 'signedIn',
            accessToken,
            refreshToken,
            requiresProfileSetup: parseBool(requiresProfileSetup),
            requiresPinSetup: parseBool(requiresPinSetup),
            requiresPinVerify: needsPinVerify,
          };
        }

        // If state is signed out, set to signed in
        if (currentState.status === 'signedOut') {
          return {
            status: 'signedIn',
            accessToken,
            refreshToken,
            requiresProfileSetup: parseBool(requiresProfileSetup),
            requiresPinSetup: parseBool(requiresPinSetup),
            requiresPinVerify: needsPinVerify,
          };
        }

        // State is already signed in with PIN required - only update if tokens changed
        if (currentState.status === 'signedIn' && currentState.accessToken !== accessToken) {
          if (__DEV__) {
            console.log('[Auth] Bootstrap: Tokens changed, updating state');
          }
          return {
            ...currentState,
            accessToken,
            refreshToken,
            requiresProfileSetup: parseBool(requiresProfileSetup),
            requiresPinSetup: parseBool(requiresPinSetup),
            requiresPinVerify: needsPinVerify,
          };
        }

        // No change needed - preserve current state
        if (__DEV__) {
          console.log('[Auth] Bootstrap: No change needed, preserving state');
        }
        return currentState;
      });
    } else {
      setState((currentState) => {
        if (currentState.status === 'signedOut') {
          return currentState;
        }
        return { status: 'signedOut' };
      });
    }
  }, []);

  // Only bootstrap once on mount
  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const setSessionFromVerifyOtp = useCallback(async (resp: VerifyOtpResponse) => {
    const profileSetup = resp.requires_profile_setup;
    const pinSetup = resp.requires_profile_setup ? true : resp.is_new_user;
    const pinVerify = resp.requires_pin && !resp.requires_profile_setup;

    // Persist all auth data
    await Promise.all([
      SecureKV.set('auth.accessToken', resp.access_token),
      SecureKV.set('auth.refreshToken', resp.refresh_token),
      SecureKV.set('auth.requiresProfileSetup', String(profileSetup)),
      SecureKV.set('auth.requiresPinSetup', String(pinSetup)),
      SecureKV.set('auth.requiresPinVerify', String(pinVerify)),
    ]);

    setState({
      status: 'signedIn',
      accessToken: resp.access_token,
      refreshToken: resp.refresh_token,
      requiresProfileSetup: profileSetup,
      requiresPinSetup: pinSetup,
      requiresPinVerify: pinVerify,
    });
  }, []);

  const completeProfileSetup = useCallback(async () => {
    // Persist the updated flags
    await Promise.all([
      SecureKV.set('auth.requiresProfileSetup', 'false'),
      SecureKV.set('auth.requiresPinSetup', 'true'),
    ]);

    setState((s) => {
      if (s.status !== 'signedIn') return s;
      return { ...s, requiresProfileSetup: false, requiresPinSetup: true };
    });
  }, []);

  const completePinSetup = useCallback(async () => {
    // Persist the updated flags
    await Promise.all([
      SecureKV.set('auth.requiresPinSetup', 'false'),
      SecureKV.set('auth.requiresPinVerify', 'false'),
    ]);

    setState((s) => {
      if (s.status !== 'signedIn') return s;
      return { ...s, requiresPinSetup: false, requiresPinVerify: false };
    });
  }, []);

  const completePinVerify = useCallback(async () => {
    // Update state to mark PIN as verified
    // Note: We don't update storage because we want PIN to be required again on next app start
    setState((s) => {
      if (s.status !== 'signedIn') return s;
      return { ...s, requiresPinVerify: false };
    });
  }, []);

  const signOut = useCallback(async () => {
    // Clear all auth-related data
    await Promise.all([
      SecureKV.del('auth.accessToken'),
      SecureKV.del('auth.refreshToken'),
      SecureKV.del('auth.requiresProfileSetup'),
      SecureKV.del('auth.requiresPinSetup'),
      SecureKV.del('auth.requiresPinVerify'),
    ]);
    
    // Reset bootstrap flag to allow re-bootstrap after sign out
    bootstrapRunRef.current = false;
    
    // Clear profile store (including persisted storage)
    await useProfileStore.getState().reset();
    
    // Clear React Query cache
    queryClient.clear();
    
    setState({ status: 'signedOut' });
  }, []);

  // Track app state to detect when app is terminated
  useEffect(() => {
    let appState = AppState.currentState;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // When app goes to background, mark that it was backgrounded
      if (appState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        // App is going to background - if PIN was verified, we'll require it again on next start
        // This is handled by bootstrap reading from storage
        if (__DEV__) {
          console.log('[Auth] App going to background');
        }
      } else if (appState === 'background' && nextAppState === 'active') {
        // App is coming back from background
        // If app was terminated and restarted, bootstrap will have run and reset state
        // If app was just backgrounded, state should still be preserved
        if (__DEV__) {
          console.log('[Auth] App coming back to foreground');
        }
      }

      appState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);


  // Set up authentication failure handler
  useEffect(() => {
    const handleAuthFailure = async () => {
      if (__DEV__) {
        console.log('[Auth] Authentication failed, signing out...');
      }
      await signOut();
    };

    setAuthenticationFailureHandler(handleAuthFailure);

    return () => {
      clearAuthenticationFailureHandler();
    };
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
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider />');
  return ctx;
}
