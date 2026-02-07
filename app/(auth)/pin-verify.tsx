import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '@/features/auth/auth-context';
import { useVerifyPin } from '@/features/auth/auth-hooks';
import { HttpError } from '@/lib/http';
import { PinInput } from '@/components/ui/pin-input';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';

const PIN_LENGTH = 6;
const _LOCKOUT_THRESHOLD = 5;
const WARNING_THRESHOLD = 3;
const LOCKOUT_CLEAR_DELAY = 2000;

// Helper function to format lockout message (memoized outside component)
const formatLockoutMessage = (seconds: number): string => {
  if (seconds <= 0) {
    return 'คุณใส่รหัส PIN ผิดเกิน 5 ครั้ง กรุณาลองใหม่อีกครั้ง';
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `คุณใส่รหัส PIN ผิดเกิน 5 ครั้ง กรุณารออีก ${minutes} นาที ${secs} วินาที`;
  }
  return `คุณใส่รหัส PIN ผิดเกิน 5 ครั้ง กรุณารออีก ${secs} วินาที`;
};

export default function PinVerifyScreen() {
  const insets = useSafeAreaInsets();
  const { completePinVerify, state } = useAuth();
  const requiresPinVerify = state.status === 'signedIn' ? state.requiresPinVerify : false;

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number | null>(null);
  const [isCheckingLockout, setIsCheckingLockout] = useState(true);

  const inputRef = useRef<TextInput>(null);
  const isSubmittingRef = useRef(false);
  const lastPinRef = useRef('');
  const hasCheckedLockoutRef = useRef(false);

  const verifyPinMutation = useVerifyPin();
  const mutateAsyncRef = useRef(verifyPinMutation.mutateAsync);
  mutateAsyncRef.current = verifyPinMutation.mutateAsync;

  // Check if user is currently locked out
  const isLockedOut = useMemo(
    () => attemptsRemaining === 0 &&
      lockoutRemainingSeconds !== null &&
      lockoutRemainingSeconds > 0,
    [attemptsRemaining, lockoutRemainingSeconds]
  );

  // Check if input should be disabled
  const isInputDisabled = useMemo(
    () => isCheckingLockout ||
      isLockedOut ||
      verifyPinMutation.isPending ||
      isSubmittingRef.current,
    [isCheckingLockout, isLockedOut, verifyPinMutation.isPending]
  );

  // Check lockout status on mount
  useEffect(() => {
    if (hasCheckedLockoutRef.current || state.status === 'loading') {
      return;
    }

    if (state.status !== 'signedIn' || !requiresPinVerify) {
      setIsCheckingLockout(false);
      hasCheckedLockoutRef.current = true;
      return;
    }

    const checkLockoutStatus = async () => {
      hasCheckedLockoutRef.current = true;

      try {
        const res = await mutateAsyncRef.current('000000');

        // Check if user has a PIN
        if (res.has_pin === false) {
          // User doesn't have a PIN, skip verification
          await completePinVerifyRef.current();
          return;
        }

        if (res.attempts_remaining === 0 && res.lockout_remaining_seconds) {
          setAttemptsRemaining(0);
          setLockoutRemainingSeconds(res.lockout_remaining_seconds);
          setError(formatLockoutMessage(res.lockout_remaining_seconds));
        } else if (res.attempts_remaining != null) {
          setAttemptsRemaining(res.attempts_remaining);
        }
      } catch (e) {
        if (__DEV__) {
          console.log('[PinVerify] Error checking lockout status:', e);
        }

        // If there's an error checking PIN, check if it's because user doesn't have a PIN
        // This might need to be adjusted based on actual API error responses
        try {
          const errorBody = e instanceof HttpError ? (e.body as { error_code?: string }) : undefined;
          if (errorBody?.error_code === 'NO_PIN_SET') {
            // User doesn't have a PIN, skip verification
            await completePinVerifyRef.current();
            return;
          }
        } catch (_parseError) {
          // Ignore parsing errors
        }
      } finally {
        setIsCheckingLockout(false);
      }
    };

    void checkLockoutStatus();
  }, [state.status, requiresPinVerify]);

  // Submit PIN verification
  const completePinVerifyRef = useRef(completePinVerify);
  completePinVerifyRef.current = completePinVerify;

  const onSubmit = useCallback(async (pinToVerify: string) => {
    // Prevent submission if conditions aren't met
    const currentState = state;
    const currentIsLockedOut = isLockedOut;

    if (
      (currentState.status === 'signedIn' && !currentState.requiresPinVerify) ||
      currentIsLockedOut ||
      isSubmittingRef.current ||
      verifyPinMutation.isPending ||
      pinToVerify === lastPinRef.current
    ) {
      if (__DEV__) {
        console.log('[PinVerify] Submission blocked');
      }
      return;
    }

    if (__DEV__) {
      console.log('[PinVerify] Submitting PIN...');
    }

    isSubmittingRef.current = true;
    lastPinRef.current = pinToVerify;
    setError(null);

    try {
      const res = await mutateAsyncRef.current(pinToVerify);

      if (res.verified) {
        if (__DEV__) {
          console.log('[PinVerify] PIN verified successfully');
        }
        setPin('');
        lastPinRef.current = '';
        await completePinVerifyRef.current();
      } else {
        if (__DEV__) {
          console.log('[PinVerify] PIN verification failed');
        }

        setPin('');
        lastPinRef.current = '';
        setAttemptsRemaining(res.attempts_remaining ?? null);
        setLockoutRemainingSeconds(res.lockout_remaining_seconds ?? null);

        if (res.attempts_remaining === 0) {
          setError('คุณใส่รหัส PIN ผิดเกิน 5 ครั้ง');
        } else {
          setError(
            res.attempts_remaining
              ? `รหัส PIN ไม่ถูกต้อง (เหลือ ${res.attempts_remaining} ครั้ง)`
              : 'รหัส PIN ไม่ถูกต้อง'
          );
        }
        isSubmittingRef.current = false;
      }
    } catch (e) {
      if (__DEV__) {
        console.log('[PinVerify] PIN verification error:', e);
      }

      setPin('');
      lastPinRef.current = '';
      isSubmittingRef.current = false;

      if (e instanceof HttpError) {
        const body = e.body as { error?: string };
        setError(body?.error ?? 'ยืนยัน PIN ไม่สำเร็จ');
      } else {
        setError('ยืนยัน PIN ไม่สำเร็จ');
      }
    }
  }, [
    verifyPinMutation.isPending,
    isLockedOut,
    state,
  ]);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutRemainingSeconds === null || lockoutRemainingSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setLockoutRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemainingSeconds]);

  // Update error message during countdown
  useEffect(() => {
    if (attemptsRemaining === 0 && lockoutRemainingSeconds !== null) {
      if (lockoutRemainingSeconds <= 0) {
        setError(formatLockoutMessage(0));

        const timeout = setTimeout(() => {
          setLockoutRemainingSeconds(null);
          setAttemptsRemaining(null);
          setError(null);
        }, LOCKOUT_CLEAR_DELAY);

        return () => clearTimeout(timeout);
      } else {
        setError(formatLockoutMessage(lockoutRemainingSeconds));
      }
    }
  }, [lockoutRemainingSeconds, attemptsRemaining]);

  // Auto-submit when PIN is complete
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {

    if (
      isInputDisabled ||
      (state.status === 'signedIn' && !requiresPinVerify) ||
      pin.length !== PIN_LENGTH ||
      pin === lastPinRef.current
    ) {
      return;
    }

    if (__DEV__) {
      console.log('[PinVerify] Auto-submitting PIN...');
    }

    void onSubmitRef.current(pin);
  }, [pin, isInputDisabled, state.status, requiresPinVerify]);

  // Handle digit press
  const handleDigitPress = useCallback((digit: string) => {
    if (isInputDisabled || pin.length >= PIN_LENGTH) {
      return;
    }

    if (pin.length === 0) {
      lastPinRef.current = '';
    }

    setPin((prev) => prev + digit);
  }, [pin.length, isInputDisabled]);

  // Handle backspace
  const handleBackspace = useCallback(() => {
    if (isInputDisabled) {
      return;
    }

    setPin((prev) => {
      const newPin = prev.slice(0, -1);
      if (newPin.length === 0) {
        lastPinRef.current = '';
      }
      return newPin;
    });
  }, [isInputDisabled]);

  // Show warning for low attempts
  const showWarning = attemptsRemaining !== null &&
    attemptsRemaining > 0 &&
    attemptsRemaining <= WARNING_THRESHOLD;

  return (
    <ImageBackground
      source={require('@/assets/bg.png')}
      resizeMode="cover"
      style={styles.bg}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.body, {
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 16
        }]}>
          {/* Header with icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="lock" size={48} color="#FFFFFF" />
            </View>
            <ThemedText style={styles.title}>
              ใส่รหัส PIN
            </ThemedText>
          </View>

          {/* PIN Input */}
          <View style={styles.pinSection}>
            <PinInput
              length={PIN_LENGTH}
              value={pin}
              onChange={setPin}
              autoFocus={false}
              error={!!error}
              large
            />

            {error && (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            )}

            {showWarning && (
              <ThemedText style={styles.warningText}>
                ระวัง: เหลือโอกาสอีก {attemptsRemaining} ครั้ง
              </ThemedText>
            )}
          </View>

          {/* Numeric Keypad and Footer */}
          <View style={styles.bottomSection}>
            <View style={styles.keypadContainer}>
              <NumericKeypad
                onDigitPress={handleDigitPress}
                onBackspacePress={handleBackspace}
              />
            </View>

            {/* Footer text */}
            <View style={styles.footer}>
              <ThemedText style={styles.footerText}>
                กรอกรหัส PIN 6 หลักของคุณ
              </ThemedText>
            </View>
          </View>

          {/* Hidden input for keyboard handling */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={pin}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            showSoftInputOnFocus={false}
            editable={false}
          />
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    gap: 16,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 13 * 1.3,
  },
  pinSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    gap: 16,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 32
  },
  warningText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#FF9500',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keypadContainer: {
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.7,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});