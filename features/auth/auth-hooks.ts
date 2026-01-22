import { useMutation } from '@tanstack/react-query';
import { setupPin, verifyPin } from './auth-api';
import type { HttpError } from '@/lib/http';

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
