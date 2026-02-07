import { Platform } from "react-native";
import { getApiBaseUrl } from "@/lib/env";
import { SecureKV } from "@/lib/secure-store";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export class AuthenticationError extends HttpError {
  constructor(message: string = "Authentication failed", body: unknown = {}) {
    super(401, message, body);
    this.name = "AuthenticationError";
  }
}

// Global callback for authentication failures
let onAuthenticationFailure: (() => void) | null = null;

export function setAuthenticationFailureHandler(handler: () => void) {
  onAuthenticationFailure = handler;
}

export function clearAuthenticationFailureHandler() {
  onAuthenticationFailure = null;
}

async function parseJsonOrText(res: Response) {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return await res.json();
  return await res.text();
}

async function refreshTokens() {
  const refreshToken = await SecureKV.get("auth.refreshToken");
  if (!refreshToken) {
    if (__DEV__) {
      console.log("[HTTP] No refresh token available");
    }
    return null;
  }

  const url = `${getApiBaseUrl()}/api/v1/auth/refresh-token`;

  if (__DEV__) {
    console.log("[HTTP] Attempting to refresh token");
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: "Unknown error" }));
      if (__DEV__) {
        console.error("[HTTP] Refresh token failed:", { status: res.status, error: errorBody });
      }
      return null;
    }

    const data = (await res.json()) as { access_token: string; refresh_token: string };
    await SecureKV.set("auth.accessToken", data.access_token);
    await SecureKV.set("auth.refreshToken", data.refresh_token);

    if (__DEV__) {
      console.log("[HTTP] Token refreshed successfully");
    }

    return { accessToken: data.access_token, refreshToken: data.refresh_token };
  } catch (error) {
    if (__DEV__) {
      console.error("[HTTP] Refresh token error:", error);
    }
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  opts?: {
    method?: HttpMethod;
    body?: unknown;
    auth?: boolean;
    headers?: Record<string, string>;
  }
): Promise<T> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const method = opts?.method ?? "GET";
  const headers: Record<string, string> = {
    ...(opts?.headers ?? {}),
  };
  let body: string | undefined;
  if (opts?.body !== undefined) {
    headers["content-type"] = headers["content-type"] ?? "application/json";
    body = headers["content-type"].includes("application/json")
      ? JSON.stringify(opts.body)
      : String(opts.body);
  }

  if (opts?.auth) {
    const accessToken = await SecureKV.get("auth.accessToken");
    if (accessToken) headers.authorization = `Bearer ${accessToken}`;
  }

  const doReq = async () => {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout (reduced from 30s)

    try {
      if (__DEV__) {
        console.log("[HTTP] Making request:", { url, method, headers, body });
      }

      const response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (__DEV__) {
        console.log("[HTTP] Response:", {
          url,
          status: response.status,
          statusText: response.statusText,
        });
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (__DEV__) {
        console.error("[HTTP] Request error:", {
          url,
          error,
          errorName: error instanceof Error ? error.name : "Unknown",
        });
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new HttpError(408, "Request timeout", {
          error: "Request took too long to complete",
          url,
        });
      }

      // Network errors
      if (error instanceof TypeError && error.message.includes("Network request failed")) {
        throw new HttpError(0, "Network request failed", {
          error:
            "Cannot connect to server. Please check your network connection and ensure the API server is running.",
          url,
          hint:
            Platform.OS === "android"
              ? "For Android emulator, make sure the API server is accessible via 10.0.2.2"
              : undefined,
        });
      }

      throw error;
    }
  };

  let res = await doReq();

  // One retry with refresh token on 401 for auth-protected endpoints.
  if (opts?.auth && res.status === 401) {
    if (__DEV__) {
      console.log("[HTTP] Received 401, attempting to refresh token");
    }

    const refreshed = await refreshTokens();
    if (refreshed?.accessToken) {
      if (__DEV__) {
        console.log("[HTTP] Retrying request with new token");
      }
      headers.authorization = `Bearer ${refreshed.accessToken}`;
      res = await doReq();
    } else {
      if (__DEV__) {
        console.error("[HTTP] Token refresh failed, user needs to re-authenticate");
      }
      // Clear tokens since refresh failed
      await SecureKV.del("auth.accessToken");
      await SecureKV.del("auth.refreshToken");
      // Trigger sign out callback if set
      if (onAuthenticationFailure) {
        onAuthenticationFailure();
      }
      // Throw AuthenticationError to indicate user needs to login again
      throw new AuthenticationError("Session expired. Please login again.", {
        error: "Token refresh failed",
        error_code: "SESSION_EXPIRED",
      });
    }
  }

  if (!res.ok) {
    const parsed = await parseJsonOrText(res);
    const msg =
      typeof parsed === "object" && parsed !== null && "message" in parsed
        ? (parsed as { message: string }).message
        : typeof parsed === "string"
          ? parsed
          : "Request failed";

    const errorBody = typeof parsed === "object" ? parsed : { error: msg };

    if (__DEV__) {
      console.error(`[HTTP] Error ${res.status}:`, errorBody);
    }

    throw new HttpError(res.status, msg, errorBody);
  }

  return (await res.json()) as T;
}
