import Constants from "expo-constants";
import { Platform } from "react-native";
import { getApiBaseUrl, shouldUseMockApi } from "@/lib/env";
import { apiFetch } from "@/lib/http";

import type { VerifyOtpResponse } from "./auth-types";

/**
 * Log API request details for debugging
 */
function logApiRequest(endpoint: string, method: string, body: unknown, isMock: boolean) {
  if (__DEV__) {
    console.log(`[API ${isMock ? "MOCK" : "REAL"}] ${method} ${endpoint}`, {
      url: `${getApiBaseUrl()}${endpoint}`,
      body,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Log API response details for debugging
 */
function logApiResponse(endpoint: string, response: unknown, isMock: boolean) {
  if (__DEV__) {
    console.log(`[API ${isMock ? "MOCK" : "REAL"}] Response from ${endpoint}`, {
      response,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Mock implementation for requestOtp
 */
async function mockRequestOtp(
  phoneNumber: string
): Promise<{ message: string; expires_in_seconds: number }> {
  logApiRequest("/api/v1/auth/request-otp", "POST", { phone_number: phoneNumber }, true);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  const response = {
    message: "OTP sent successfully (MOCK)",
    expires_in_seconds: 180,
  };

  logApiResponse("/api/v1/auth/request-otp", response, true);
  return response;
}

/**
 * Mock implementation for verifyOtp
 */
async function mockVerifyOtp(params: {
  phoneNumber: string;
  otp: string;
  deviceUuid: string;
  deviceName?: string;
}): Promise<VerifyOtpResponse> {
  logApiRequest("/api/v1/auth/verify-otp", "POST", params, true);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 800));

  // Mock response - accept any 6-digit OTP for testing
  const isValidOtp = /^\d{6}$/.test(params.otp);

  if (!isValidOtp) {
    throw new Error("Invalid OTP format (MOCK)");
  }

  const response: VerifyOtpResponse = {
    access_token: `mock_access_token_${Date.now()}`,
    refresh_token: `mock_refresh_token_${Date.now()}`,
    user_id: `mock_user_id_${Date.now()}`,
    device_id: 1,
    is_new_user: true,
    requires_profile_setup: true,
    requires_pin: false,
  };

  logApiResponse("/api/v1/auth/verify-otp", response, true);
  return response;
}

/**
 * Request OTP code to be sent to the phone number
 */
export async function requestOtp(phoneNumber: string) {
  const useMock = shouldUseMockApi();

  if (useMock) {
    return await mockRequestOtp(phoneNumber);
  }

  logApiRequest("/api/v1/auth/request-otp", "POST", { phone_number: phoneNumber }, false);

  try {
    const response = await apiFetch<{ message: string; expires_in_seconds: number }>(
      "/api/v1/auth/request-otp",
      {
        method: "POST",
        body: { phone_number: phoneNumber },
      }
    );

    logApiResponse("/api/v1/auth/request-otp", response, false);
    return response;
  } catch (error) {
    if (__DEV__) {
      console.error("[API] requestOtp error:", error);
    }
    throw error;
  }
}

/**
 * Verify OTP code and authenticate user
 */
export async function verifyOtp(params: {
  phoneNumber: string;
  otp: string;
  deviceUuid: string;
  deviceName?: string;
}) {
  const useMock = shouldUseMockApi();

  const platform =
    Platform.OS === "ios" ? 1 : Platform.OS === "android" ? 2 : Platform.OS === "web" ? 3 : 4;
  const deviceName =
    params.deviceName ??
    // expo-constants has `deviceName` on some platforms; safe fallback.
    (Constants as unknown as { deviceName?: string }).deviceName ??
    undefined;

  const requestBody = {
    phone_number: params.phoneNumber,
    otp: params.otp,
    device_uuid: params.deviceUuid,
    device_name: deviceName,
    platform,
  };

  if (useMock) {
    return await mockVerifyOtp(params);
  }

  logApiRequest("/api/v1/auth/verify-otp", "POST", requestBody, false);

  try {
    const response = await apiFetch<VerifyOtpResponse>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: requestBody,
    });

    logApiResponse("/api/v1/auth/verify-otp", response, false);
    return response;
  } catch (error) {
    if (__DEV__) {
      console.error("[API] verifyOtp error:", error);
    }
    throw error;
  }
}

export interface ProfileResponse {
  user_id: string;
  phone_number: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  profile_picture_url: string | null;
  background_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function getProfile(): Promise<ProfileResponse> {
  return await apiFetch<ProfileResponse>("/api/v1/auth/profile", {
    method: "GET",
    auth: true,
  });
}

export async function setupProfile(params: {
  displayName: string;
  bio?: string;
  profilePictureUrl?: string;
  backgroundImageUrl?: string;
}) {
  return await apiFetch<{
    user_id: string;
    display_name: string;
    username: string | null;
    bio: string | null;
    profile_picture_url: string | null;
    background_image_url: string | null;
    updated_at: string;
  }>("/api/v1/auth/setup-profile", {
    method: "POST",
    auth: true,
    body: {
      display_name: params.displayName,
      bio: params.bio ?? null,
      profile_picture_url: params.profilePictureUrl ?? null,
      background_image_url: params.backgroundImageUrl ?? null,
    },
  });
}

export async function setupPin(params: {
  pin: string;
  confirmPin: string;
  enableRegistrationLock: boolean;
}) {
  return await apiFetch<{ registration_lock_enabled: boolean; message: string }>(
    "/api/v1/auth/setup-pin",
    {
      method: "POST",
      auth: true,
      body: {
        pin: params.pin,
        confirm_pin: params.confirmPin,
        enable_registration_lock: params.enableRegistrationLock,
      },
    }
  );
}

export async function verifyPin(pin: string) {
  return await apiFetch<{
    verified: boolean;
    attempts_remaining?: number | null;
    lockout_remaining_seconds?: number | null;
  }>("/api/v1/auth/verify-pin", {
    method: "POST",
    auth: true,
    body: { pin },
  });
}
