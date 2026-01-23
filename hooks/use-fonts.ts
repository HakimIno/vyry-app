import { FontMapping } from "@/constants/fonts";

/**
 * Hook to get the mapped font name for LINE Seed Sans Thai fonts
 * Provides backward compatibility with existing font names
 */
export function useMappedFont(fontName: keyof typeof FontMapping): string {
  return FontMapping[fontName] || fontName;
}

/**
 * Function to get the mapped font name for LINE Seed Sans Thai fonts
 * This can be used directly in StyleSheet objects
 */
export function getMappedFont(fontName: keyof typeof FontMapping): string {
  return FontMapping[fontName] || fontName;
}
