import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChatHeader } from '@/components/chat/chat-header';
import { FilterTabs } from '@/components/chat/filter-tabs';
import { ConversationItem } from '@/components/chat/conversation-item';
import { ErrorView } from '@/components/common/error-view';
import { IosButton } from '@/components/ui/ios-button';
import { MOCK_CONVERSATIONS } from '@/constants/chat';
import type { Conversation, FilterTab } from '@/types/chat';


// Hook: Filter conversations based on search and active tab
function useFilteredConversations(
  conversations: Conversation[],
  searchQuery: string,
  activeTab: FilterTab
) {
  return useMemo(() => {
    let filtered = conversations;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (conv) =>
          conv.name.toLowerCase().includes(query) ||
          conv.lastMessage.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    switch (activeTab) {
      case 'unread':
        filtered = filtered.filter((conv) => conv.unreadCount > 0);
        break;
      case 'favourites':
        filtered = filtered.filter((conv) => conv.isPinned);
        break;
      case 'groups':
        filtered = filtered.filter((conv) => conv.isGroup);
        break;
      default:
        break;
    }

    return filtered;
  }, [conversations, searchQuery, activeTab]);
}

// Sub-component: Empty state
function EmptyState({
  searchQuery,
  activeTab,
  placeholderColor,
}: {
  searchQuery: string;
  activeTab: FilterTab;
  placeholderColor: string;
}) {
  const getMessage = () => {
    if (searchQuery) return 'No chats found';
    switch (activeTab) {
      case 'unread':
        return 'No unread messages';
      case 'favourites':
        return 'No favourite chats';
      case 'groups':
        return 'No group chats';
      default:
        return 'No chats yet';
    }
  };

  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={placeholderColor} />
      <ThemedText style={[styles.emptyText, { color: placeholderColor }]}>
        {getMessage()}
      </ThemedText>
    </View>
  );
}

// Sub-component: List header with filter tabs and archived section
function ListHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}) {
  const handleArchivedPress = () => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // TODO: Navigate to archived chats
    console.log('Open archived chats');
  };

  return (
    <>
      <FilterTabs activeTab={activeTab} onTabChange={onTabChange} />
    </>
  );
}

// Main screen component
export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);

  // Derived state
  const bgColor = isDark ? '#000000' : '#FFFFFF';
  const placeholderColor = isDark ? '#636366' : '#8E8E93';
  const filteredConversations = useFilteredConversations(
    conversations,
    searchQuery,
    activeTab
  );

  // Fetch conversations (placeholder for future API integration)
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const data = await fetchConversations();
      // setConversations(data);

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 500));
      setConversations(MOCK_CONVERSATIONS);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load conversations'));
      setIsLoading(false);
    }
  }, []);

  // Load conversations on mount
  React.useEffect(() => {
    void refetch();
  }, []);

  // Handlers
  const handleConversationPress = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // TODO: Navigate to conversation
    console.log('Open conversation:', id);
  }, []);

  const handleConversationLongPress = useCallback((id: string) => {
    // TODO: Show conversation options (delete, pin, mute, etc.)
    console.log('Long press conversation:', id);
  }, []);

  const handleCameraPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // TODO: Open camera
    console.log('Open camera');
  }, []);

  const handleNewChatPress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    // TODO: Open new chat screen
    console.log('New chat');
  }, []);

  const handleMorePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // TODO: Show more options
    console.log('More options');
  }, []);

  // Render item for FlashList
  const renderConversationItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationItem
        conversation={item}
        onPress={handleConversationPress}
        onLongPress={handleConversationLongPress}
      />
    ),
    [handleConversationPress, handleConversationLongPress]
  );

  const keyExtractor = useCallback((item: Conversation) => item.id, []);

  // Show loading state
  if (isLoading && conversations.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.centerContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
      </ThemedView>
    );
  }

  // Show error state (only if no conversations loaded)
  if (error && conversations.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
        <ErrorView
          error={error}
          onRetry={refetch}
          customMessage="ไม่สามารถโหลดรายการแชทได้"
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
      <ChatHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCameraPress={handleCameraPress}
        onNewChatPress={handleNewChatPress}
        onMorePress={handleMorePress}
      />

      {/* Show error banner if there's an error but we have cached data */}
      {error && conversations.length > 0 && (
        <View style={[styles.errorBanner, {
          backgroundColor: isDark ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 59, 48, 0.05)',
          borderBottomColor: isDark ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 59, 48, 0.2)'
        }]}>
          <ThemedText style={[styles.errorBannerText, { color: isDark ? '#FF3B30' : '#FF3B30' }]}>
            {error instanceof Error && error.message.includes('Network request failed')
              ? 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้'
              : 'ไม่สามารถโหลดข้อมูลล่าสุดได้'}
          </ThemedText>
          <IosButton
            title="ลองอีกครั้ง"
            onPress={refetch}
            style={{ marginTop: 8 }}
            variant="outline"
          />
        </View>
      )}

      <FlashList<Conversation>
        data={filteredConversations}
        keyExtractor={keyExtractor}
        renderItem={renderConversationItem}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 80,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <ListHeader activeTab={activeTab} onTabChange={setActiveTab} />
        }
        ListEmptyComponent={
          <EmptyState
            searchQuery={searchQuery}
            activeTab={activeTab}
            placeholderColor={placeholderColor}
          />
        }
        overScrollMode='never'
        refreshing={isLoading}
        onRefresh={refetch}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 17,
    marginTop: 16,
    fontFamily: 'Roboto_400Regular',
  },
  errorBanner: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  errorBannerText: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Roboto_400Regular',
    lineHeight: 20,
  },
});
