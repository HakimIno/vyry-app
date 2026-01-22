import React from 'react';
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IosButton } from '@/components/ui/ios-button';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HttpError } from '@/lib/http';

interface ErrorViewProps {
  error: Error | null;
  onRetry?: () => void;
  retryTitle?: string;
  customMessage?: string;
}

export function ErrorView({ error, onRetry, retryTitle = 'ลองอีกครั้ง', customMessage }: ErrorViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const placeholderColor = isDark ? '#636366' : '#8E8E93';

  // Check if error is a network/connection error
  const isNetworkError = error instanceof HttpError && error.status === 0;
  
  let errorMessage = customMessage || 'ไม่สามารถโหลดข้อมูลได้';
  
  if (isNetworkError) {
    errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต';
  } else if (error) {
    errorMessage = customMessage || 'ไม่สามารถโหลดข้อมูลได้';
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
      <ThemedText style={[styles.errorText, { color: placeholderColor }]}>
        {errorMessage}
      </ThemedText>
      {onRetry && (
        <IosButton
          title={retryTitle}
          onPress={onRetry}
          style={{ marginTop: 24 }}
          size='small'
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Roboto_500Medium',
    lineHeight: 24,
  },
});
