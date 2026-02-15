import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { getAvatarUrl } from "@/components/ui/avatar-picker-sheet";
import { READ_CHECK_BLUE, WHATSAPP_GREEN } from "@/constants/chat";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Conversation, MessageStatus } from "@/types/chat";

interface ConversationItemProps {
  conversation: Conversation;
  onPress: (id: string) => void;
  onLongPress?: (id: string) => void;
}

// Sub-component: Avatar with online status ring
const AvatarWithStatus = React.memo(
  ({ seed, url, isOnline, size = 56 }: { seed: string; url?: string; isOnline?: boolean; size?: number }) => {
    const avatarUrl = url || getAvatarUrl(seed);
    const ringSize = size + 6;

    return (
      <View style={[styles.avatarWrapper, { width: ringSize, height: ringSize }]}>
        {isOnline && (
          <View
            style={[
              styles.onlineRing,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                borderColor: WHATSAPP_GREEN,
              },
            ]}
          />
        )}
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatar,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          contentFit="cover"
        />
      </View>
    );
  }
);

AvatarWithStatus.displayName = "AvatarWithStatus";

// Sub-component: Message status checkmarks
const MessageStatusIcon = React.memo(({ status }: { status?: MessageStatus }) => {
  if (!status || status === "sending") return null;

  const color = status === "read" ? READ_CHECK_BLUE : "#8E8E93";

  if (status === "sent") {
    return <Ionicons name="checkmark" size={16} color={color} />;
  }

  return (
    <View style={styles.doubleCheck}>
      <Ionicons name="checkmark-done" size={16} color={color} />
    </View>
  );
});

MessageStatusIcon.displayName = "MessageStatusIcon";

// Sub-component: Last message preview
const MessagePreview = React.memo(
  ({
    conversation,
    placeholderColor,
  }: {
    conversation: Conversation;
    placeholderColor: string;
  }) => {
    const { isTyping, isDeleted, messageStatus, lastMessage } = conversation;

    if (isTyping) {
      return (
        <ThemedText style={[styles.lastMessage, { color: WHATSAPP_GREEN }]}>typing...</ThemedText>
      );
    }

    if (isDeleted) {
      return (
        <View style={styles.messageWithIcon}>
          <Ionicons name="ban-outline" size={14} color={placeholderColor} />
          <ThemedText style={[styles.lastMessage, styles.italicText, { color: placeholderColor }]}>
            You deleted this message.
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.messageWithIcon}>
        <MessageStatusIcon status={messageStatus} />
        <ThemedText style={[styles.lastMessage, { color: placeholderColor }]} numberOfLines={1}>
          {lastMessage}
        </ThemedText>
      </View>
    );
  }
);

MessagePreview.displayName = "MessagePreview";

// Main component
export const ConversationItem = React.memo(
  ({ conversation, onPress, onLongPress }: ConversationItemProps) => {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const bgColor = isDark ? "#000000" : "#FFFFFF";
    const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
    const placeholderColor = isDark ? "#8E8E93" : "#8E8E93";

    const handlePress = React.useCallback(() => {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onPress(conversation.id);
    }, [onPress, conversation.id]);

    const handleLongPress = React.useCallback(() => {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      onLongPress?.(conversation.id);
    }, [onLongPress, conversation.id]);

    const hasUnread = conversation.unreadCount > 0;
    const timestampColor = hasUnread ? WHATSAPP_GREEN : placeholderColor;

    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          { backgroundColor: bgColor, borderBottomColor: borderColor },
          pressed && styles.pressed,
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
      >
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <AvatarWithStatus
            seed={conversation.avatarSeed}
            url={conversation.avatarUrl}
            isOnline={conversation.isOnline}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {conversation.name}
            </ThemedText>
            <ThemedText style={[styles.timestamp, { color: timestampColor }]}>
              {conversation.timestamp}
            </ThemedText>
          </View>

          <View style={styles.messageRow}>
            <View style={styles.messageContent}>
              <MessagePreview conversation={conversation} placeholderColor={placeholderColor} />
            </View>

            {/* Right side indicators */}
            <View style={styles.indicators}>
              {conversation.isPinned && (
                <Ionicons name="pin" size={16} color={placeholderColor} style={styles.pinIcon} />
              )}
              {conversation.hasMention && (
                <View style={styles.mentionBadge}>
                  <ThemedText style={styles.mentionText}>@</ThemedText>
                </View>
              )}
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <ThemedText style={styles.unreadText}>
                    {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  },
  // Custom comparison: only re-render when displayed data actually changes
  (prevProps, nextProps) => {
    const prev = prevProps.conversation;
    const next = nextProps.conversation;
    return (
      prev.id === next.id &&
      prev.lastMessage === next.lastMessage &&
      prev.timestamp === next.timestamp &&
      prev.unreadCount === next.unreadCount &&
      prev.isOnline === next.isOnline &&
      prev.isTyping === next.isTyping &&
      prev.messageStatus === next.messageStatus &&
      prev.name === next.name &&
      prev.avatarUrl === next.avatarUrl &&
      prevProps.onPress === nextProps.onPress &&
      prevProps.onLongPress === nextProps.onLongPress
    );
  }
);

ConversationItem.displayName = "ConversationItem";

// Re-export Conversation type for backward compatibility
export type { Conversation } from "@/types/chat";

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: "rgba(0, 0, 0, 0.02)",
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatarWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  onlineRing: {
    position: "absolute",
    borderWidth: 2,
  },
  avatar: {
    backgroundColor: "rgba(142, 142, 147, 0.1)",
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    letterSpacing: -0.3,
    fontFamily: "LINESeedSansTH_Bd",
    flex: 1,
    marginRight: 8,
  },
  timestamp: {
    fontSize: 13,
    letterSpacing: -0.1,
    fontFamily: "LINESeedSansTH_Rg",
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  messageContent: {
    flex: 1,
    marginRight: 8,
  },
  messageWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  lastMessage: {
    fontSize: 15,
    letterSpacing: -0.2,
    fontFamily: "LINESeedSansTH_Rg",
    flex: 1,
  },
  italicText: {
    fontStyle: "italic",
  },
  doubleCheck: {
    marginRight: 2,
  },
  indicators: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pinIcon: {
    transform: [{ rotate: "45deg" }],
  },
  mentionBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: WHATSAPP_GREEN,
    alignItems: "center",
    justifyContent: "center",
  },
  mentionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "LINESeedSansTH_Bd",
  },
  unreadBadge: {
    backgroundColor: WHATSAPP_GREEN,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "LINESeedSansTH_Bd",
  },
});
