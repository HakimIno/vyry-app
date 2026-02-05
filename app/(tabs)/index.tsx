import { Ionicons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChatHeader } from "@/components/chat/chat-header";
import { ConversationItem } from "@/components/chat/conversation-item";
import { FilterTabs } from "@/components/chat/filter-tabs";
import { ErrorView } from "@/components/common/error-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
// import { MOCK_CONVERSATIONS } from "@/constants/chat"; // Removed mock
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Conversation, FilterTab } from "@/types/chat";
import { useFriends } from "@/hooks/use-friends";
import type { Friend } from "@/features/friends/api";

// Helper to map Friend to Conversation
function mapFriendToConversation(friend: Friend): Conversation {
  return {
    id: friend.user_id,
    name: friend.display_name || friend.username || "Unknown",
    avatarSeed: friend.user_id, // Use user_id as seed
    avatarUrl: friend.profile_picture || undefined,
    lastMessage: "Start a conversation",
    timestamp: new Date(friend.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    unreadCount: 0,
    isPinned: false,
    isGroup: false,
    isOnline: false, // API doesn't return online status yet
  };
}

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
          conv.name.toLowerCase().includes(query) || conv.lastMessage.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    switch (activeTab) {
      case "unread":
        filtered = filtered.filter((conv) => conv.unreadCount > 0);
        break;
      case "favourites":
        filtered = filtered.filter((conv) => (conv.isPinned ?? false));
        break;
      case "groups":
        filtered = filtered.filter((conv) => (conv.isGroup ?? false));
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
    if (searchQuery) return "No chats found";
    switch (activeTab) {
      case "unread":
        return "No unread messages";
      case "favourites":
        return "No favourite chats";
      case "groups":
        return "No group chats";
      default:
        return "No friends yet. Add one!"; // Default state
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
  return <FilterTabs activeTab={activeTab} onTabChange={onTabChange} />;
}

// Main screen component
export default function ChatsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const router = useRouter();
  const isDark = colorScheme === "dark";

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // API Hooks
  const { data: friends, isLoading, error, refetch } = useFriends();

  // Derived conversations from friends
  const conversationList: Conversation[] = useMemo(() => {
    return friends?.map(mapFriendToConversation) ?? [];
  }, [friends]);

  // Derived state
  const bgColor = isDark ? "#000000" : "#FFFFFF";
  const placeholderColor = isDark ? "#636366" : "#8E8E93";
  const filteredConversations = useFilteredConversations(conversationList, searchQuery, activeTab);

  // Handlers
  const handleConversationPress = useCallback((id: string) => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to conversation
    router.push(`/chat/${id}`);
  }, [router]);

  const handleConversationLongPress = useCallback((id: string) => {
    console.log("Long press conversation:", id);
  }, []);

  const handleCameraPress = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log("Open camera");
  }, []);

  const handleNewChatPress = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/users/search");
  }, [router]);

  const handleMorePress = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    console.log("More options");
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
  if (isLoading) {
    return (
      <ThemedView style={[styles.container, styles.centerContainer, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={isDark ? "#FFFFFF" : "#000000"} />
      </ThemedView>
    );
  }

  // Show error state
  if (error && conversationList.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
        <ErrorView error={error as Error} onRetry={() => refetch()} customMessage="ไม่สามารถโหลดรายชื่อเพื่อนได้" />
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
      {error && conversationList.length > 0 && (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: isDark ? "rgba(255, 59, 48, 0.1)" : "rgba(255, 59, 48, 0.05)",
              borderBottomColor: isDark ? "rgba(255, 59, 48, 0.3)" : "rgba(255, 59, 48, 0.2)",
            },
          ]}
        >
          <ThemedText style={[styles.errorBannerText, { color: isDark ? "#FF3B30" : "#FF3B30" }]}>
            Can't update list
          </ThemedText>
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
        ListHeaderComponent={<ListHeader activeTab={activeTab} onTabChange={setActiveTab} />}
        ListEmptyComponent={
          <EmptyState
            searchQuery={searchQuery}
            activeTab={activeTab}
            placeholderColor={placeholderColor}
          />
        }
        overScrollMode="never"
        refreshing={isLoading}
        onRefresh={() => refetch()}
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
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 17,
    marginTop: 16,
    fontFamily: "LINESeedSansTH_Rg",
  },
  errorBanner: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  errorBannerText: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: "LINESeedSansTH_Rg",
    lineHeight: 20,
  },
});
