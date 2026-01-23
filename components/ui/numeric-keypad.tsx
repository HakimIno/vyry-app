import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface NumericKeypadProps {
  onDigitPress: (digit: string) => void;
  onBackspacePress: () => void;
}

const DIGITS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const;

export function NumericKeypad({ onDigitPress, onBackspacePress }: NumericKeypadProps) {
  const digits = useMemo(() => DIGITS, []);

  return (
    <View style={styles.container}>
      {/* Number rows */}
      {digits.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((digit) => (
            <KeypadButton
              key={digit}
              label={digit}
              onPress={() => onDigitPress(digit)}
            />
          ))}
        </View>
      ))}
      
      {/* Bottom row: 0 and backspace */}
      <View style={styles.row}>
        <View style={[styles.button, { backgroundColor: 'transparent'}]}></View>
        <KeypadButton
          label="0"
          onPress={() => onDigitPress('0')}
        />
        <KeypadButton
          label=""
          onPress={onBackspacePress}
          isBackspace
        />
      </View>
    </View>
  );
}

const KeypadButton = React.memo(
  ({
    label,
    onPress,
    isBackspace = false,
  }: {
    label: string;
    onPress: () => void;
    isBackspace?: boolean;
  }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    const handlePressIn = () => {
      scale.value = withTiming(0.92, {
        duration: 100,
      });
      opacity.value = withTiming(0.6, {
        duration: 100,
      });
      if (!isBackspace) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    };

    const handlePressOut = () => {
      scale.value = withTiming(1, {
        duration: 150,
      });
      opacity.value = withTiming(1, {
        duration: 150,
      });
    };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[styles.button, animatedStyle]}
    >
      {isBackspace ? (
        <MaterialIcons
          name="backspace"
          size={24}
          color="#FFFFFF"
        />
      ) : (
        <ThemedText style={styles.buttonText}>
          {label}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
  }
);

KeypadButton.displayName = 'KeypadButton';

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginBottom: 16,
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 32,
    fontFamily: 'Roboto_500Medium',
    color: '#FFFFFF',
  },
});
