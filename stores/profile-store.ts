import React from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

// Adjust the import path based on where your getProfile function is defined
import { getProfile, ProfileResponse } from '../features/auth/auth-api';

interface ProfileStore {
  profile: ProfileResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  reset: () => Promise<void>;
}

// Create MMKV instance for profile storage (only on native)
// Using createMMKV() API from react-native-mmkv V3
let profileStorage: ReturnType<typeof import('react-native-mmkv').createMMKV> | null = null;
if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv');
    profileStorage = createMMKV({
      id: 'profile-storage',
    });
  } catch {
    // MMKV not available, will use fallback
    profileStorage = null;
  }
}

// Create storage adapter that works on both web and native
const getStorage = () => {
  if (Platform.OS === 'web') {
    return {
      getItem: (name: string): Promise<string | null> => {
        try {
          const value = localStorage.getItem(name);
          return Promise.resolve(value);
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (name: string, value: string): Promise<void> => {
        try {
          localStorage.setItem(name, value);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
      removeItem: (name: string): Promise<void> => {
        try {
          localStorage.removeItem(name);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
    };
  }
  
  // For native, use MMKV (synchronous API wrapped in async)
  // MMKV V3 API: set(), getString(), remove(), clearAll()
  if (profileStorage) {
    return {
      getItem: (name: string): Promise<string | null> => {
        try {
          const value = profileStorage!.getString(name);
          return Promise.resolve(value ?? null);
        } catch {
          return Promise.resolve(null);
        }
      },
      setItem: (name: string, value: string): Promise<void> => {
        try {
          profileStorage!.set(name, value);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
      removeItem: (name: string): Promise<void> => {
        try {
          profileStorage!.remove(name);
          return Promise.resolve();
        } catch {
          return Promise.resolve();
        }
      },
    };
  }
  
  // Fallback if MMKV is not available
  return {
    getItem: () => Promise.resolve(null),
    setItem: () => Promise.resolve(),
    removeItem: () => Promise.resolve(),
  };
};

const storage = createJSONStorage(() => getStorage());

export const useProfileStore = create<ProfileStore>()(
  devtools(
    persist(
      (set, get) => ({
        profile: null,
        isLoading: false,
        error: null,
        
        refetch: () => {
          const state = get();
          
          // Update loading state
          set({ isLoading: true, error: null });
          
          // Get profile data
          getProfile()
            .then((data) => {
              set({ profile: data, isLoading: false });
            })
            .catch((error) => {
              set({ error, isLoading: false });
            });
        },
        
        reset: async () => {
          set({ profile: null, isLoading: false, error: null });
          // Clear persisted storage
          if (Platform.OS === 'web') {
            const storageInstance = getStorage();
            await storageInstance.removeItem('profile-storage');
          } else if (profileStorage) {
            // MMKV: clear all keys
            profileStorage.clearAll();
          }
        }
      }),
      {
        name: 'profile-storage', // name for the persisted storage
        storage,
        partialize: (state) => ({ 
          profile: state.profile,
          // Don't persist isLoading and error states
        }),
      }
    )
  )
);

// Custom hook to initialize the profile data
export const useProfile = () => {
  const { profile, isLoading, error, refetch } = useProfileStore();
  
  // Auto-fetch profile if not available
  React.useEffect(() => {
    if (!profile && !isLoading && !error) {
      refetch();
    }
  }, [profile, isLoading, error, refetch]);
  
  return { profile, isLoading, error, refetch };
};