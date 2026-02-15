import { RealmManager } from './realm';
import { Message, Conversation } from './realm/schema';
import { ChatMessage, MessageStatus } from '@/types/chat';
import { Realm } from '@realm/react';

// Simple event emitter for updates
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export const MessageStorage = {
    getMessages: (conversationId: string): ChatMessage[] => {
        try {
            const realm = RealmManager.get();
            const messages = realm.objects<Message>('Message')
                .filtered('conversationId == $0', conversationId)
                .sorted('timestamp', false); // false = ASC (oldest first)

            // Convert to plain objects
            return messages.map(m => ({
                id: m.id,
                text: m.text,
                sender: m.sender as 'me' | 'them',
                time: m.time,
                status: m.status as MessageStatus,
                isRead: m.isRead,
                timestamp: m.timestamp,
                type: m.type as 'text' | 'image',
                serverId: m.serverId
            }));
        } catch (e) {
            console.error('[MessageStorage] Failed to get messages', e);
            return [];
        }
    },

    getLastMessage: (conversationId: string): ChatMessage | undefined => {
        try {
            const realm = RealmManager.get();
            const messages = realm.objects<Message>('Message')
                .filtered('conversationId == $0', conversationId)
                .sorted('timestamp', true); // DESC = newest first

            const last = messages[0];
            if (!last) return undefined;

            return {
                id: last.id,
                text: last.text,
                sender: last.sender as 'me' | 'them',
                time: last.time,
                status: last.status as MessageStatus,
                isRead: last.isRead,
                timestamp: last.timestamp,
                type: last.type as 'text' | 'image',
                serverId: last.serverId
            };
        } catch (e) {
            return undefined;
        }
    },

    getUnreadCount: (conversationId: string): number => {
        try {
            const realm = RealmManager.get();
            return realm.objects<Message>('Message')
                .filtered('conversationId == $0 AND isRead == false', conversationId)
                .length;
        } catch (e) {
            return 0;
        }
    },

    saveMessage: (conversationId: string, message: ChatMessage) => {
        try {
            const realm = RealmManager.get();
            realm.write(() => {
                realm.create('Message', {
                    id: message.id,
                    conversationId: conversationId,
                    text: message.text,
                    sender: message.sender,
                    time: message.time,
                    status: message.status || 'pending',
                    isRead: message.isRead,
                    timestamp: message.timestamp || Date.now(),
                    type: message.type || 'text',
                    serverId: message.serverId
                }, Realm.UpdateMode.Modified);
            });
            MessageStorage.notifyListeners();
        } catch (e) {
            console.error('[MessageStorage] Failed to save message', e);
        }
    },

    saveMessages: (conversationId: string, messages: ChatMessage[]) => {
        try {
            const realm = RealmManager.get();
            realm.write(() => {
                for (const message of messages) {
                    realm.create('Message', {
                        id: message.id,
                        conversationId: conversationId,
                        text: message.text,
                        sender: message.sender,
                        time: message.time,
                        status: message.status || 'pending',
                        isRead: message.isRead,
                        timestamp: message.timestamp || Date.now(),
                        type: message.type || 'text',
                        serverId: message.serverId
                    }, Realm.UpdateMode.Modified);
                }
            });
            MessageStorage.notifyListeners();
        } catch (e) {
            console.error('[MessageStorage] Failed to save messages', e);
        }
    },

    updateMessageStatus: (conversationId: string, messageId: string, status: MessageStatus) => {
        try {
            const realm = RealmManager.get();
            realm.write(() => {
                const message = realm.objectForPrimaryKey<Message>('Message', messageId);
                if (message) {
                    message.status = status;
                }
            });
            MessageStorage.notifyListeners();
        } catch (e) {
            console.error('[MessageStorage] Failed to update status', e);
        }
    },

    markAllAsRead: (conversationId: string) => {
        try {
            const realm = RealmManager.get();
            const unread = realm.objects<Message>('Message')
                .filtered('conversationId == $0 AND isRead == false', conversationId);

            // Only write + notify if there are actually unread messages
            if (unread.length === 0) return;

            realm.write(() => {
                for (const message of unread) {
                    message.isRead = true;
                }
            });
            MessageStorage.notifyListeners();
        } catch (e) {
            console.error('[MessageStorage] Failed to mark as read', e);
        }
    },

    saveConversationMapping: (userId: string, conversationId: string) => {
        try {
            const realm = RealmManager.get();
            realm.write(() => {
                realm.create('Conversation', {
                    id: conversationId,
                    userId: userId
                }, Realm.UpdateMode.Modified);
            });
        } catch (e) {
            console.error('[MessageStorage] Failed to save mapping', e);
        }
    },

    getConversationId: (userId: string): string | undefined => {
        try {
            const realm = RealmManager.get();
            const conversation = realm.objects<Conversation>('Conversation')
                .filtered('userId == $0', userId)[0];
            return conversation?.id;
        } catch (e) {
            return undefined;
        }
    },

    getLastServerMessageId: (): number | undefined => {
        try {
            const realm = RealmManager.get();
            const maxId = realm.objects<Message>('Message').max('serverId') as number | undefined;
            return maxId ?? undefined;
        } catch (e) {
            return undefined;
        }
    },

    clear: (conversationId: string) => {
        try {
            const realm = RealmManager.get();
            realm.write(() => {
                const messages = realm.objects<Message>('Message')
                    .filtered('conversationId == $0', conversationId);
                realm.delete(messages);
            });
            MessageStorage.notifyListeners();
        } catch (e) {
            console.error('[MessageStorage] Failed to clear', e);
        }
    },

    subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => { listeners.delete(listener); };
    },

    notifyListeners: () => {
        listeners.forEach(l => l());
    }
};
