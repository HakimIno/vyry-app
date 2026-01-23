import type { Conversation, FilterTab } from "@/types/chat";

// Filter tab labels
export const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "favourites", label: "Favourites" },
  { key: "groups", label: "Groups" },
];

// Mock conversation data matching WhatsApp-style UI
export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: "1",
    name: "Jenny ❤️",
    lastMessage: 'You reacted 😘 to "That\'s good advice, Marty."',
    timestamp: "16:14",
    unreadCount: 0,
    avatarSeed: "jenny",
    isOnline: true,
    isPinned: true,
    messageStatus: "read",
    reactionEmoji: "😘",
  },
  {
    id: "2",
    name: "Mom 💕",
    lastMessage: "Mom is typing...",
    timestamp: "19:45",
    unreadCount: 1,
    avatarSeed: "mom",
    isOnline: false,
    isTyping: true,
    hasMention: true,
  },
  {
    id: "3",
    name: "Daddy",
    lastMessage: "I mean he wrecked it! 🤯",
    timestamp: "19:42",
    unreadCount: 0,
    avatarSeed: "daddy",
    isOnline: false,
    messageStatus: "read",
  },
  {
    id: "4",
    name: "Biff Tannen",
    lastMessage: "Say hi to your mom for me.",
    timestamp: "18:23",
    unreadCount: 0,
    avatarSeed: "biff",
    isOnline: false,
  },
  {
    id: "5",
    name: "Clocktower Lady",
    lastMessage: "📋 Save the clock tower?",
    timestamp: "16:15",
    unreadCount: 0,
    avatarSeed: "clocktower",
    isOnline: false,
  },
  {
    id: "6",
    name: "Mr. Strickland",
    lastMessage: "You deleted this message.",
    timestamp: "08:57",
    unreadCount: 0,
    avatarSeed: "strickland",
    isOnline: false,
    isDeleted: true,
  },
  {
    id: "7",
    name: 'Emmett "Doc" Brown',
    lastMessage: "Great Scott! The flux capacitor...",
    timestamp: "08:24",
    unreadCount: 3,
    avatarSeed: "doc",
    isOnline: true,
    isGroup: false,
  },
  {
    id: "8",
    name: "Hill Valley Squad",
    lastMessage: "Where we're going, we don't need roads.",
    timestamp: "Yesterday",
    unreadCount: 0,
    avatarSeed: "squad",
    isOnline: false,
    isGroup: true,
    messageStatus: "delivered",
  },
];

// Color constants
export const WHATSAPP_GREEN = "#25D366";
export const WHATSAPP_TEAL = "#128C7E";
export const WHATSAPP_LIGHT_GREEN = "#DCF8C6";
export const READ_CHECK_BLUE = "#53BDEB";
