import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type Key =
  | "auth.accessToken"
  | "auth.refreshToken"
  | "auth.requiresProfileSetup"
  | "auth.requiresPinSetup"
  | "auth.requiresPinVerify"
  | "auth.hasPin"
  | "auth.pinVerifiedAt"
  | "device.uuid"
  | "device.name"
  | "device.platform";

async function webGetItem(key: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

async function webSetItem(key: string, value: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

async function webDeleteItem(key: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const SecureKV = {
  async get(key: Key) {
    if (Platform.OS === "web") return await webGetItem(key);
    return await SecureStore.getItemAsync(key);
  },
  async set(key: Key, value: string) {
    if (Platform.OS === "web") return await webSetItem(key, value);
    return await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  },
  async del(key: Key) {
    if (Platform.OS === "web") return await webDeleteItem(key);
    return await SecureStore.deleteItemAsync(key);
  },
};
