import React from 'react';
import { StyleSheet, View, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'ค้นหา' }: SearchBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const searchBgColor = isDark ? 'rgba(118, 118, 128, 0.12)' : '#F2F2F7';
  const searchTextColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const placeholderColor = isDark ? '#636366' : '#8E8E93';

  return (
    <View style={[styles.container, { backgroundColor: searchBgColor }]}>
      <Ionicons
        name="search"
        size={18}
        color={placeholderColor}
        style={styles.searchIcon}
      />
      <TextInput
        style={[styles.input, { color: searchTextColor }]}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color={placeholderColor} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 36,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 17,
    letterSpacing: -0.2,
    fontFamily: 'Roboto_400Regular',
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
});
