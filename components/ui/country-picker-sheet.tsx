import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, TextInput, SectionList } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { GestureHandlerRootView, Pressable } from 'react-native-gesture-handler';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from '../themed-text';
import { fetchCountries, type Country } from '@/lib/countries-api';

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
    const isDark = colorScheme === 'dark';
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch countries using React Query
    const { data: countries = [], isLoading, error } = useQuery({
      queryKey: ['countries'],
      queryFn: fetchCountries,
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
    });

    // Memoize the snap points to prevent re-renders
    const snapPoints = useMemo(() => [0.94], []);

    // Group countries by first letter and apply search filter
    const { sections, filteredSections } = useMemo(() => {
      // Group countries by first letter
      const groupedCountries = countries.reduce((acc, country) => {
        const firstLetter = country.name.charAt(0).toUpperCase();
        if (!acc[firstLetter]) {
          acc[firstLetter] = [];
        }
        acc[firstLetter].push(country);
        return acc;
      }, {} as Record<string, Country[]>);

      // Convert to sections format
      const sections = Object.keys(groupedCountries)
        .sort()
        .map(letter => ({
          title: letter,
          data: groupedCountries[letter].sort((a, b) => a.name.localeCompare(b.name)),
        }));

      // Filter sections based on search query
      let filteredSections = sections;
      if (searchQuery.trim()) {
        filteredSections = sections
          .map(section => ({
            ...section,
            data: section.data.filter(country =>
              country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              country.code.toLowerCase().includes(searchQuery.toLowerCase())
            ),
          }))
          .filter(section => section.data.length > 0);
      }

      return { sections, filteredSections };
    }, [countries, searchQuery]);

    // Calculate section index data for the alphabet index
    const sectionIndexData = useMemo(() => {
      return sections.map(section => section.title);
    }, [sections]);

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present();
      },
      dismiss: () => {
        sheetRef.current?.dismiss();
      },
    }));

    const handleCountrySelect = (country: Country) => {
      onCountrySelect(country);
      sheetRef.current?.dismiss();
    };

    // Render country item
    const renderCountryItem = ({ item }: { item: Country }) => (
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
    );


    // Render section header
    const renderSectionHeader = ({ section }: { section: { title: string } }) => (
      <View style={[styles.sectionHeader, { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }]}>
        <ThemedText style={styles.sectionHeaderText}>{section.title}</ThemedText>
      </View>
    );


    // Render content based on state
    const renderContent = () => {
      if (isLoading) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#1C1C1E'} />
          </View>
        );
      }

      if (error) {
        return (
          <View style={styles.centerContainer}>
            <ThemedText style={styles.errorText}>
              Failed to load countries. Please try again.
            </ThemedText>
          </View>
        );
      }

      if (searchQuery.trim() && filteredSections.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <ThemedText style={styles.errorText}>
              No countries found matching "{searchQuery}"
            </ThemedText>
          </View>
        );
      }

      return (
        <View style={styles.listContainer}>
          <SectionList
            sections={searchQuery.trim() ? filteredSections : sections}
            keyExtractor={(item: Country) => item.code}
            renderItem={renderCountryItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.sectionListContainer}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
            SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
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
        backgroundColor={isDark ? '#1A1A1A' : '#FFFFFF'}
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
                  color={isDark ? '#8E8E93' : '#8E8E93'}
                  style={styles.searchIcon}
                />
                <TextInput
                  style={[
                    styles.searchInput,
                    { color: isDark ? '#FFFFFF' : '#000000' }
                  ]}
                  placeholder="Search countries..."
                  placeholderTextColor={isDark ? '#8E8E93' : '#8E8E93'}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  searchContainer: {
    marginBottom: 8,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
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
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    marginHorizontal: 8,
  },
  sectionIndexItem: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
    width: 20,
    marginVertical: 2,
  },
  sectionIndexText: {
    fontSize: 12,
    fontWeight: '600',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  countryItemSelected: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  countryFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  countryName: {
    fontSize: 14,
    letterSpacing: -0.2,
  },
  countryDialCode: {
    fontSize: 13,
    letterSpacing: -0.2,
    opacity: 0.7,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
});