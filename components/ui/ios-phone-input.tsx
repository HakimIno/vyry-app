import { useRef, useState } from "react";
import { Pressable, StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { type Country } from "@/lib/countries-api";
import { ThemedText } from "../themed-text";
import { CountryPickerSheet, type CountryPickerSheetRef } from "./country-picker-sheet";

const AnimatedView = Animated.View;

// Default country for initialization
const DEFAULT_COUNTRY: Country = {
  code: "TH",
  flag: "🇹🇭",
  dialCode: "+66",
  name: "Thailand",
};

// Format phone number: (201) 555-0123
const _formatPhoneNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
};

// Parse formatted phone to digits only
const parsePhoneNumber = (value: string): string => {
  return value.replace(/\D/g, "");
};

export function IosPhoneInput({
  value = "",
  onChangeText,
  onCountryChange,
  errorText,
  containerStyle,
  ...props
}: Omit<TextInputProps, "value" | "onChangeText"> & {
  value?: string;
  onChangeText?: (text: string) => void;
  onCountryChange?: (countryCode: string, dialCode: string) => void;
  errorText?: string;
  containerStyle?: object;
}) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY); // Default to US
  const borderScale = useSharedValue(0);
  const countrySheetRef = useRef<CountryPickerSheetRef>(null);

  const bgColor = isDark ? "#101010" : "#F2F2F7";
  const textColor = isDark ? "#FFFFFF" : "#1C1C1E";
  const placeholderColor = isDark ? "#636366" : "#8E8E93";
  const focusBorderColor = isDark ? "#0A84FF" : "#007AFF";
  const borderColor = isDark ? "rgba(118, 118, 128, 0.3)" : "rgba(0, 0, 0, 0.1)";

  const animatedBorderStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: borderScale.value }],
    opacity: borderScale.value,
  }));

  const handleFocus = (e: unknown) => {
    setIsFocused(true);
    borderScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    props.onFocus?.(e);
  };

  const handleBlur = (e: unknown) => {
    setIsFocused(false);
    borderScale.value = withSpring(0, { damping: 15, stiffness: 300 });
    props.onBlur?.(e);
  };

  const handlePhoneChange = (text: string) => {
    const digits = parsePhoneNumber(text);
    // Limit to 10 digits for US format
    const limited = digits.slice(0, 10);
    onChangeText?.(limited);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    onCountryChange?.(country.code, country.dialCode);
  };

  const openCountryPicker = () => {
    countrySheetRef.current?.present();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.inputWrapper, { borderColor }]}>
        {/* Country Selector */}
        <Pressable
          onPress={openCountryPicker}
          style={[
            styles.countrySelector,
            {
              backgroundColor: bgColor,
              borderRightColor: borderColor,
            },
            isFocused && {
              backgroundColor: isDark ? "rgba(118, 118, 128, 0.18)" : "#E8E8ED",
            },
          ]}
        >
          <ThemedText style={styles.flag}>{selectedCountry.flag}</ThemedText>
          <ThemedText style={[styles.countryCode, { color: textColor }]}>
            {selectedCountry.dialCode}
          </ThemedText>
        </Pressable>

        {/* Phone Input */}
        <View style={[styles.phoneInputContainer, { backgroundColor: bgColor }]}>
          {/* Phone Number Input */}
          <TextInput
            placeholderTextColor={placeholderColor}
            selectionColor={focusBorderColor}
            {...props}
            value={value}
            onChangeText={handlePhoneChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="phone-pad"
            style={[
              styles.input,
              {
                color: textColor,
              },
              props.style,
            ]}
            placeholder={props.placeholder}
          />
        </View>

        {/* Focus Border */}
        <AnimatedView
          style={[styles.focusBorder, { backgroundColor: focusBorderColor }, animatedBorderStyle]}
        />
      </View>

      {errorText && (
        <ThemedText style={[styles.helperText, styles.errorText]}>{errorText}</ThemedText>
      )}

      {/* Country Picker Sheet */}
      <CountryPickerSheet
        ref={countrySheetRef}
        selectedCountryCode={selectedCountry.code}
        onCountrySelect={handleCountrySelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  inputWrapper: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 13,
    flexDirection: "row",
    borderWidth: 1,
  },
  countrySelector: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRightWidth: 1,
    minWidth: 70,
    justifyContent: "center",
  },
  flag: {
    fontSize: 20,
    marginRight: 8,
  },
  dropdownArrow: {
    width: 8,
    height: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  arrow: {
    fontSize: 8,
    fontWeight: "bold",
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  countryCode: {
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    flex: 1,
    height: 42,
    fontSize: 14,
    letterSpacing: -0.2,
    paddingVertical: 0,
  },
  focusBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  helperText: {
    fontSize: 13,
    marginTop: 6,
    letterSpacing: -0.1,
  },
  errorText: {
    color: "#FF3B30",
  },
  separator: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 4,
  },
});
