import { createMMKV } from "react-native-mmkv";
import { ChatMessage } from "@/hooks/use-chat";

export const storage = createMMKV({
    id: "chat-storage",
    encryptionKey: "secure-chat-key",
});

export const MessageStorage = {
    saveMessage: (conversationId: string, message: ChatMessage) => {
        const key = `messages:${conversationId}`;
        const existingString = storage.getString(key);
        const existing: ChatMessage[] = existingString ? JSON.parse(existingString) : [];

        // Deduplicate
        if (existing.some(m => m.id === message.id)) return;

        const updated = [...existing, message];
        storage.set(key, JSON.stringify(updated));

        // Notify listeners
        MessageStorage.notifyListeners();
    },

    saveMessages: (conversationId: string, messages: ChatMessage[]) => {
        const key = `messages:${conversationId}`;
        const existingString = storage.getString(key);
        const existing: ChatMessage[] = existingString ? JSON.parse(existingString) : [];

        // Create a map for faster deduplication
        const messageMap = new Map(existing.map(m => [m.id, m]));

        messages.forEach(m => {
            messageMap.set(m.id, m);
        });

        const updated = Array.from(messageMap.values()).sort((a, b) =>
            new Date(a.time).getTime() - new Date(b.time).getTime()
        );

        storage.set(key, JSON.stringify(updated));

        // Notify listeners
        MessageStorage.notifyListeners();
    },

    getMessages: (conversationId: string): ChatMessage[] => {
        const key = `messages:${conversationId}`;
        const data = storage.getString(key);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch {
            return [];
        }
    },

    getLastMessage: (conversationId: string): ChatMessage | undefined => {
        const messages = MessageStorage.getMessages(conversationId);
        return messages[messages.length - 1];
    },

    // Simple unread count: in a real app, you'd track "last read" timestamp
    // For now, let's assume all messages from "others" that aren't marked read are unread.
    // Since we don't have "mark read" locally yet, we'll return 0 or implement a simple "seen" logic later.
    // For this pass, we will mainly focus on Last Message.
    getUnreadCount: (conversationId: string): number => {
        return 0;
    },

    clear: (conversationId: string) => {
        const key = `messages:${conversationId}`;
        storage.remove(key);
        MessageStorage.notifyListeners();
    },

    // Listener system
    listeners: new Set<() => void>(),

    subscribe: (callback: () => void) => {
        MessageStorage.listeners.add(callback);
        return () => {
            MessageStorage.listeners.delete(callback);
        };
    },

    notifyListeners: () => {
        MessageStorage.listeners.forEach(cb => cb());
    }
};
