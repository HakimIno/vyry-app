import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '@/features/auth/auth-context';
import { useVerifyPin } from '@/features/auth/auth-hooks';
import { HttpError } from '@/lib/http';
import { PinInput } from '@/components/ui/pin-input';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PIN_LENGTH = 6;

export default function PinVerifyScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { completePinVerify, state } = useAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);
  const isSubmittingRef = useRef(false);
  const lastPinRef = useRef('');
  
  const verifyPinMutation = useVerifyPin();

  // Prevent re-render if already verified
  useEffect(() => {
    if (state.status === 'signedIn' && !state.requiresPinVerify) {
      // Already verified, clear everything to prevent re-submission
      setPin('');
      isSubmittingRef.current = false;
      lastPinRef.current = '';
    }
  }, [state]);

  const onSubmit = useCallback(async (pinToVerify: string) => {
    // Check if already verified
    if (state.status === 'signedIn' && !state.requiresPinVerify) {
      if (__DEV__) {
        console.log('[PinVerify] Already verified, skipping submit');
      }
      return;
    }

    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      if (__DEV__) {
        console.log('[PinVerify] Already submitting, skipping');
      }
      return;
    }

    if (verifyPinMutation.isPending) {
      if (__DEV__) {
        console.log('[PinVerify] Mutation pending, skipping');
      }
      return;
    }

    // Prevent submitting the same PIN twice
    if (pinToVerify === lastPinRef.current) {
      if (__DEV__) {
        console.log('[PinVerify] Same PIN already submitted, skipping');
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
      const res = await verifyPinMutation.mutateAsync(pinToVerify);
      if (res.verified) {
        if (__DEV__) {
          console.log('[PinVerify] PIN verified successfully');
        }
        // Clear PIN immediately to prevent re-submission
        setPin('');
        lastPinRef.current = '';
        // Complete PIN verification - this will update state and trigger navigation
        await completePinVerify();
        if (__DEV__) {
          console.log('[PinVerify] PIN verification completed, navigation should happen');
        }
        // Don't reset isSubmittingRef here - let it stay true to prevent re-submission
      } else {
        if (__DEV__) {
          console.log('[PinVerify] PIN verification failed');
        }
        setPin('');
        lastPinRef.current = '';
        setAttemptsRemaining(res.attempts_remaining ?? null);
        setError(
          res.attempts_remaining
            ? `รหัส PIN ไม่ถูกต้อง (เหลือ ${res.attempts_remaining} ครั้ง)`
            : 'รหัส PIN ไม่ถูกต้อง'
        );
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
  }, [verifyPinMutation, completePinVerify, state]);

  // Auto-submit when PIN is complete (only once per PIN)
  useEffect(() => {
    // Don't submit if already verified
    if (state.status === 'signedIn' && !state.requiresPinVerify) {
      if (__DEV__) {
        console.log('[PinVerify] Already verified, skipping auto-submit');
      }
      return;
    }

    // Don't submit if already submitting or pending
    if (isSubmittingRef.current || verifyPinMutation.isPending) {
      return;
    }

    // Don't submit if PIN is not complete
    if (pin.length !== PIN_LENGTH) {
      return;
    }

    // Don't submit if this PIN was already submitted
    if (pin === lastPinRef.current) {
      return;
    }

    if (__DEV__) {
      console.log('[PinVerify] Auto-submitting PIN...');
    }
    
    void onSubmit(pin);
  }, [pin, verifyPinMutation.isPending, onSubmit, state]);

  const handleDigitPress = useCallback((digit: string) => {
    if (pin.length < PIN_LENGTH && !verifyPinMutation.isPending && !isSubmittingRef.current) {
      // Reset last PIN when user starts typing again
      if (pin.length === 0) {
        lastPinRef.current = '';
      }
      setPin((prev) => prev + digit);
    }
  }, [pin.length, verifyPinMutation.isPending]);

  const handleBackspace = useCallback(() => {
    if (!verifyPinMutation.isPending && !isSubmittingRef.current) {
      setPin((prev) => {
        const newPin = prev.slice(0, -1);
        // Reset last PIN if cleared completely
        if (newPin.length === 0) {
          lastPinRef.current = '';
        }
        return newPin;
      });
    }
  }, [verifyPinMutation.isPending]);

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
        <View style={[styles.body, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
          {/* Header with icon */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="lock" size={48} color="#FFFFFF" />
            </View>
            <ThemedText style={[styles.title, { color: '#FFFFFF' }]}>
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

            {attemptsRemaining !== null && attemptsRemaining <= 3 && (
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
              <ThemedText style={[styles.footerText, { color: '#FFFFFF' }]}>
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
    fontFamily: 'Roboto_500Medium',
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
    fontSize: 14,
    fontFamily: 'Roboto_400Regular',
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
  },
  warningText: {
    fontSize: 11,
    fontFamily: 'Roboto_400Regular',
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
    fontFamily: 'Roboto_400Regular',
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
