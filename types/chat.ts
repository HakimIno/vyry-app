// Chat-related type definitions

export type MessageStatus = "pending" | "sending" | "sent" | "delivered" | "read" | "failed";

export type FilterTab = "all" | "unread" | "favourites" | "groups";

export interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  avatarSeed: string;
  avatarUrl?: string;
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

export interface ChatFilterState {
  count: number;
  isVisible: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "me" | "them";
  time: string;
  type?: "text" | "image";
  isRead?: boolean;
  status?: MessageStatus;
  timestamp?: number;
  serverId?: number;
}
