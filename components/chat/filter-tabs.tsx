import React from 'react';
import { StyleSheet, View, Pressable, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { FILTER_TABS, WHATSAPP_GREEN } from '@/constants/chat';
import type { FilterTab } from '@/types/chat';

interface FilterTabsProps {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
  onAddFilter?: () => void;
}

export function FilterTabs({ activeTab, onTabChange, onAddFilter }: FilterTabsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activeBgColor = WHATSAPP_GREEN;
  const inactiveBgColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  const activeTextColor = '#FFFFFF';
  const inactiveTextColor = isDark ? '#FFFFFF' : '#1C1C1E';

  const handleTabPress = (tab: FilterTab) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onTabChange(tab);
  };

  const handleAddPress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onAddFilter?.();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                styles.tab,
                { backgroundColor: isActive ? activeBgColor : inactiveBgColor },
              ]}
              onPress={() => handleTabPress(tab.key)}
            >
              <ThemedText
                style={[
                  styles.tabText,
                  { color: isActive ? activeTextColor : inactiveTextColor },
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}

        {/* Add filter button */}
        <Pressable
          style={[styles.addButton, { backgroundColor: inactiveBgColor }]}
          onPress={handleAddPress}
        >
          <Ionicons
            name="add"
            size={18}
            color={inactiveTextColor}
          />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    height: 32
  },
  tabText: {
    fontSize: 13,
    fontFamily: 'Roboto_500Medium',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
