import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { useAuth } from '@/features/auth/auth-context';
import { useSetupPin } from '@/features/auth/auth-hooks';
import { HttpError } from '@/lib/http';
import { PinInput } from '@/components/ui/pin-input';
import { NumericKeypad } from '@/components/ui/numeric-keypad';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

const PIN_LENGTH = 6;

type Step = 'create' | 'confirm';

export default function PinSetupScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { completePinSetup } = useAuth();

  const [step, setStep] = useState<Step>('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);
  
  const setupPinMutation = useSetupPin();

  // Auto-advance when PIN is complete
  useEffect(() => {
    if (step === 'create' && pin.length === PIN_LENGTH) {
      // Small delay for visual feedback
      setTimeout(() => {
        setStep('confirm');
      }, 300);
    }
  }, [pin, step]);

  // Auto-submit when confirm PIN is complete
  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === PIN_LENGTH && !setupPinMutation.isPending) {
      void onSubmit();
    }
  }, [confirmPin, step, setupPinMutation.isPending]);

  const completePinSetupRef = useRef(completePinSetup);
  completePinSetupRef.current = completePinSetup;

  const onSubmit = useCallback(async () => {
    if (pin !== confirmPin) {
      setError('รหัส PIN ไม่ตรงกัน');
      setConfirmPin('');
      return;
    }

    setError(null);
    try {
      await setupPinMutation.mutateAsync({
        pin,
        confirmPin,
        enableRegistrationLock: true,
      });
      await completePinSetupRef.current();
      // Navigation is handled by AuthGuard after state update
    } catch (e) {
      setConfirmPin('');
      if (e instanceof HttpError) {
        const body = e.body as { error?: string };
        setError(body?.error ?? 'ตั้ง PIN ไม่สำเร็จ');
      } else {
        setError('ตั้ง PIN ไม่สำเร็จ');
      }
    }
  }, [pin, confirmPin, setupPinMutation]);

  const handleDigitPress = useCallback((digit: string) => {
    if (step === 'create') {
      if (pin.length < PIN_LENGTH) {
        setPin((prev) => prev + digit);
      }
    } else {
      if (confirmPin.length < PIN_LENGTH) {
        setConfirmPin((prev) => prev + digit);
      }
    }
  }, [step, pin.length, confirmPin.length]);

  const handleBackspace = useCallback(() => {
    if (step === 'create') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  }, [step]);

  const title = useMemo(
    () => step === 'create' ? 'สร้างรหัส PIN' : 'ยืนยันรหัส PIN',
    [step]
  );

  const subtitle = useMemo(
    () => step === 'create'
      ? 'ตั้งรหัส PIN 6 หลักเพื่อความปลอดภัย'
      : 'กรอกรหัส PIN อีกครั้งเพื่อยืนยัน',
    [step]
  );

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
              {title}
            </ThemedText>
          </View>

          {/* PIN Input */}
          <View style={styles.pinSection}>
            {step === 'create' ? (
              <PinInput
                length={PIN_LENGTH}
                value={pin}
                onChange={setPin}
                autoFocus={false}
                large
              />
            ) : (
              <PinInput
                key="confirm"
                length={PIN_LENGTH}
                value={confirmPin}
                onChange={setConfirmPin}
                autoFocus={false}
                error={!!error}
                large
              />
            )}

            {error && (
              <ThemedText style={styles.errorText}>{error}</ThemedText>
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
                {subtitle}
              </ThemedText>
            </View>
          </View>

          {/* Hidden input for keyboard handling */}
          <TextInput
            ref={inputRef}
            style={styles.hiddenInput}
            value={step === 'create' ? pin : confirmPin}
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
