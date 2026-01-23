// Chat-related type definitions

export type MessageStatus = "sending" | "sent" | "delivered" | "read";

export type FilterTab = "all" | "unread" | "favourites" | "groups";

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatarSeed: string;
  isOnline?: boolean;
  isTyping?: boolean;
  isPinned?: boolean;
  isMuted?: boolean;
  isGroup?: boolean;
  messageStatus?: MessageStatus;
  hasMention?: boolean;
  isDeleted?: boolean;
  reactionEmoji?: string;
}

export interface ArchivedConversations {
  count: number;
  isVisible: boolean;
}
