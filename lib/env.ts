import Constants from 'expo-constants';
import { Platform } from 'react-native';

type Extra = {
  apiBaseUrl?: string;
  useMockApi?: boolean;
};

export function getApiBaseUrl() {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  let baseUrl = extra.apiBaseUrl?.replace(/\/+$/, '') ?? 'http://localhost:8000';
  
  // For Android emulator, only replace localhost/127.0.0.1 with 10.0.2.2
  // If a specific IP address is configured (like 10.39.116.21), use it as is
  if (Platform.OS === 'android') {
    // Only replace localhost or 127.0.0.1 with 10.0.2.2
    // Keep configured IP addresses as they are
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      baseUrl = baseUrl.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
    }
    // If a specific IP is configured, use it directly (don't convert to 10.0.2.2)
  }
  
  // Debug log to check config loading
  if (__DEV__) {
    console.log('[ENV] API Base URL:', {
      fromConfig: extra.apiBaseUrl,
      finalUrl: baseUrl,
      platform: Platform.OS,
      constantsExpoConfig: Constants.expoConfig?.extra,
    });
  }
  
  return baseUrl;
}

export function shouldUseMockApi(): boolean {
  const extra = (Constants.expoConfig?.extra ?? {}) as Extra;
  return extra.useMockApi ?? false;
}


