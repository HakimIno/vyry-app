export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type VerifyOtpResponse = {
  access_token: string;
  refresh_token: string;
  user_id: string;
  device_id: number;
  is_new_user: boolean;
  requires_profile_setup: boolean;
  requires_pin: boolean;
};

export type ApiError = {
  error: string;
  error_code: string;
  retry_after_seconds?: number;
};
