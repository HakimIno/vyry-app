/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

const tintColorLight = "#0a7ea4";
const tintColorDark = "#fff";

export const Colors = {
  light: {
    text: "#11181C",
    background: "#fff",
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#ECEDEE",
    background: "#151718",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** LINE Seed Sans Thai fonts */
    regular: "LINESeedSansTH_Rg",
    light: "LINESeedSansTH_Th",
    medium: "LINESeedSansTH_Rg",
    bold: "LINESeedSansTH_Bd",
    extraBold: "LINESeedSansTH_XBd",
    heavy: "LINESeedSansTH_He",
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "LINESeedSansTH_Rg",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    /** LINE Seed Sans Thai fonts */
    regular: "LINESeedSansTH_Rg",
    light: "LINESeedSansTH_Th",
    medium: "LINESeedSansTH_Rg",
    bold: "LINESeedSansTH_Bd",
    extraBold: "LINESeedSansTH_XBd",
    heavy: "LINESeedSansTH_He",
    /** Fallback fonts */
    sans: "LINESeedSansTH_Rg",
    serif: "serif",
    rounded: "LINESeedSansTH_Rg",
    mono: "monospace",
  },
  web: {
    /** Web fonts with LINE Seed Sans Thai as primary */
    sans: "'LINESeedSansTH_Rg', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'LINESeedSansTH_Rg', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});


export const AvatarColors = {
  light: {
    bg: "rgba(255, 255, 255, 0.3)",
    border: "rgba(255, 255, 255, 0.3)",

  },
  dark: {
    bg: "rgba(0, 0, 0, 0.3)",
    border: "rgba(0, 0, 0, 0.3)",

  },
};

// Profile page specific colors
export const ProfileColors = {
  light: {
    background: "#F5F5F7",
    cardBackground: "#FFFFFF",
    border: "rgba(0, 0, 0, 0.08)",
    placeholder: "#6C6C70",
    secondaryBackground: "#F2F2F7",
    defaultBackground: "#E5E5EA",
    text: "#000000",
  },
  dark: {
    background: "#000000",
    cardBackground: "#000000",
    border: "rgba(255, 255, 255, 0.1)",
    placeholder: "#8E8E93",
    secondaryBackground: "#2C2C2E",
    defaultBackground: "#2C2C2E",
    text: "#FFFFFF",
  },
};

// Profile page specific dimensions
export const ProfileDimensions = {
  avatar: {
    container: {
      width: 110 as const,
      height: 110 as const,
      borderRadius: 55 as const,
      borderWidth: 1 as const,
    },
    wrapper: {
      marginTop: -55 as const,
      marginBottom: 12 as const,
    },
  },
  background: {
    height: 120 as const,
    gradientHeight: 10 as const,
    gradientRadius: 20 as const,
  },
  profileCard: {
    borderRadius: 16 as const,
    marginBottom: 8 as const,
  },
  settingsCard: {
    borderRadius: 12 as const,
  },
  iconContainer: {
    width: 36 as const,
    height: 36 as const,
    borderRadius: 108 as const,
  },
  settingsItem: {
    paddingVertical: 14 as const,
    paddingHorizontal: 16 as const,
    gap: 12 as const,
  },
  sectionTitle: {
    fontSize: 13 as const,
    marginBottom: 8 as const,
    paddingHorizontal: 4 as const,
  },
  displayName: {
    fontSize: 24 as const,
    marginBottom: 10 as const,
  },
  bioText: {
    textAlign: "center" as const,
  },
  header: {
    paddingHorizontal: 16 as const,
  },
  content: {
    paddingHorizontal: 8 as const,
    paddingTop: 8 as const,
  },
  logoutContainer: {
    margin: 20 as const,
  },
  profileInfo: {
    paddingHorizontal: 20 as const,
    paddingBottom: 20 as const,
  },
};