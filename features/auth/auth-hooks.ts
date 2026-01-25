import { useMutation } from "@tanstack/react-query";
import { setupPin, verifyPin, checkPinStatus, skipPinSetup as skipPinSetupApi } from "./auth-api";

export function useSetupPin() {
  return useMutation({
    mutationFn: async (params: {
      pin: string;
      confirmPin: string;
      enableRegistrationLock: boolean;
    }) => {
      return await setupPin(params);
    },
  });
}

export function useVerifyPin() {
  return useMutation({
    mutationFn: async (pin: string) => {
      return await verifyPin(pin);
    },
  });
}

export function useCheckPinStatus() {
  return useMutation({
    mutationFn: async () => {
      return await checkPinStatus();
    },
  });
}

export function useSkipPinSetup() {
  return useMutation({
    mutationFn: async () => {
      return await skipPinSetupApi();
    },
  });
}
