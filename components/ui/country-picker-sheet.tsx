import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useQuery } from "@tanstack/react-query";
import React, { forwardRef, useImperativeHandle, useMemo, useState, useCallback } from "react";
import { ActivityIndicator, SectionList, StyleSheet, TextInput, View } from "react-native";
import { GestureHandlerRootView, Pressable } from "react-native-gesture-handler";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { type Country, fetchCountries } from "@/lib/countries-api";
import { ThemedText } from "../themed-text";
import { Fonts } from "@/constants/theme";

export interface CountryPickerSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface CountryPickerSheetProps {
  selectedCountryCode: string;
  onCountrySelect: (country: Country) => void;
}

export const CountryPickerSheet = forwardRef<CountryPickerSheetRef, CountryPickerSheetProps>(
  ({ selectedCountryCode, onCountrySelect }, ref) => {
    const sheetRef = React.useRef<TrueSheet>(null);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [searchQuery, setSearchQuery] = useState("");

    // Constants to avoid repetition
    const ICON_COLOR = "#8E8E93";
    const BACKGROUND_COLOR = isDark ? "#101010" : "#FFFFFF";
    const TEXT_COLOR = isDark ? "#FFFFFF" : "#000000";
    const INDICATOR_COLOR = isDark ? "#FFFFFF" : "#1C1C1E";

    // Fetch countries using React Query
    const {
      data: countries = [],
      isLoading,
      error,
    } = useQuery({
      queryKey: ["countries"],
      queryFn: fetchCountries,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    // Memoize sections and filtered sections together to avoid duplicate calculations
    const { sections, displaySections } = useMemo(() => {
      // Group countries by first letter
      const groupedCountries = countries.reduce(
        (acc, country) => {
          const firstLetter = country.name.charAt(0).toUpperCase();
          if (!acc[firstLetter]) {
            acc[firstLetter] = [];
          }
          acc[firstLetter].push(country);
          return acc;
        },
        {} as Record<string, Country[]>
      );

      // Convert to sections format
      const sections = Object.keys(groupedCountries)
        .sort()
        .map((letter) => ({
          title: letter,
          data: groupedCountries[letter].sort((a, b) => a.name.localeCompare(b.name)),
        }));

      // Apply search filter if needed
      const displaySections = searchQuery.trim()
        ? sections
            .map((section) => ({
              ...section,
              data: section.data.filter(
                (country) =>
                  country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  country.code.toLowerCase().includes(searchQuery.toLowerCase())
              ),
            }))
            .filter((section) => section.data.length > 0)
        : sections;

      return { sections, displaySections };
    }, [countries, searchQuery]);

    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }), []);

    const handleCountrySelect = useCallback((country: Country) => {
      onCountrySelect(country);
      sheetRef.current?.dismiss();
    }, [onCountrySelect]);

    // Render country item - memoized to prevent unnecessary re-renders
    const renderCountryItem = useCallback(({ item }: { item: Country }) => (
      <Pressable
        style={[
          styles.countryItem,
          selectedCountryCode === item.code && styles.countryItemSelected,
        ]}
        onPress={() => handleCountrySelect(item)}
      >
        <ThemedText style={styles.countryFlag}>{item.flag}</ThemedText>
        <View style={styles.countryInfo}>
          <ThemedText style={styles.countryName}>{item.name}</ThemedText>
          <ThemedText style={styles.countryDialCode}>{item.dialCode}</ThemedText>
        </View>
      </Pressable>
    ), [selectedCountryCode, handleCountrySelect]);

    // Render section header - memoized to prevent unnecessary re-renders
    const renderSectionHeader = useCallback(({ section }: { section: { title: string } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: BACKGROUND_COLOR }]}>
        <ThemedText style={styles.sectionHeaderText}>{section.title}</ThemedText>
      </View>
    ), [BACKGROUND_COLOR]);

    // Section separator component - memoized to prevent unnecessary re-renders
    const SectionSeparator = useCallback(() => (
      <View style={styles.sectionSeparator} />
    ), []);

    // Render content based on state
    const renderContent = () => {
      if (isLoading) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={INDICATOR_COLOR} />
          </View>
        );
      }

      if (error) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle" size={50} color={INDICATOR_COLOR} />
            <ThemedText style={styles.errorText}>
              Failed to load countries. Please try again.
            </ThemedText>
          </View>
        );
      }

      if (searchQuery.trim() && displaySections.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <Ionicons name="search" size={50} color={INDICATOR_COLOR} />
            <ThemedText style={styles.errorText}>
              No countries found matching &quot;
              <ThemedText style={[styles.errorText, { color: '#6EE28B', textDecorationLine: 'underline' }]}>{searchQuery}</ThemedText>
              &quot;
            </ThemedText>
          </View>
        );
      }

      return (
        <View style={styles.listContainer}>
          <SectionList
            sections={displaySections}
            keyExtractor={(item: Country) => item.code}
            renderItem={renderCountryItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.sectionListContainer}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
            SectionSeparatorComponent={SectionSeparator}
            nestedScrollEnabled
          />
        </View>
      );
    };

    return (
      <TrueSheet
        ref={sheetRef}
        cornerRadius={16}
        detents={[0.94]}
        backgroundColor={BACKGROUND_COLOR}
        scrollable
      >
        <GestureHandlerRootView style={styles.container}>
          <View style={styles.content}>
            <ThemedText style={styles.title}>Select Country</ThemedText>
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Ionicons
                  name="search"
                  size={16}
                  color={ICON_COLOR}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[styles.searchInput, { color: TEXT_COLOR }]}
                  placeholder="Search countries..."
                  placeholderTextColor={ICON_COLOR}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            </View>
            {renderContent()}
          </View>
        </GestureHandlerRootView>
      </TrueSheet>
    );
  }
);

// Common colors to avoid repetition
const BORDER_COLOR = "rgba(142, 142, 147, 0.12)";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: -0.3,
    fontFamily: Fonts.bold,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BORDER_COLOR,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
    fontFamily: Fonts.medium,
  },
  listContainer: {
    flex: 1,
  },
  sectionListContainer: {
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingHorizontal: 8,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
    fontFamily: Fonts.bold,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: BORDER_COLOR,
    marginHorizontal: 8,
  },
  countryItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  countryItemSelected: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  countryName: {
    fontSize: 14,
    letterSpacing: -0.2,
    fontFamily: Fonts.regular,
  },
  countryDialCode: {
    fontSize: 13,
    letterSpacing: -0.2,
    opacity: 0.7,
    fontFamily: Fonts.regular,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 32
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    fontFamily: Fonts.regular,
  },
});
