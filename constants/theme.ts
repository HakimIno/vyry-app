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
