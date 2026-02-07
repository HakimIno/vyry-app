import { useState, useEffect, useMemo } from 'react';
import { useFriends } from '@/hooks/use-friends';
import { MessageStorage } from '@/features/chat/storage';
import { Conversation } from '@/types/chat';

export function useConversations() {
    const { data: friends, isLoading, error, refetch } = useFriends();
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Subscribe to storage updates
    useEffect(() => {
        const unsubscribe = MessageStorage.subscribe(() => {
            setRefreshTrigger(prev => prev + 1);
        });
        return unsubscribe;
    }, []);

    const conversations: Conversation[] = useMemo(() => {
        if (!friends) return [];

        return friends.map(friend => {
            const lastMsg = MessageStorage.getLastMessage(friend.user_id);

            // Format timestamp
            let timestamp = new Date(friend.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let lastMessageText = "Start a conversation";

            if (lastMsg) {
                const date = new Date(lastMsg.time);
                // If today, show time. If yesterday, show "Yesterday". Else date.
                const now = new Date();
                const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

                if (isToday) {
                    timestamp = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } else {
                    timestamp = date.toLocaleDateString();
                }

                if (lastMsg.type === 'image') {
                    lastMessageText = 'Sent an image';
                } else {
                    lastMessageText = lastMsg.text;
                }
            }

            return {
                id: friend.user_id,
                name: friend.display_name || friend.username || "Unknown",
                avatarSeed: friend.user_id,
                avatarUrl: friend.profile_picture || undefined,
                lastMessage: lastMessageText,
                timestamp: timestamp,
                unreadCount: MessageStorage.getUnreadCount(friend.user_id),
                isPinned: false,
                isGroup: false,
                isOnline: false, // TODO: Implement online status
                rawTimestamp: lastMsg ? new Date(lastMsg.time).getTime() : 0 // For sorting
            };
        }).sort((a, b) => b.rawTimestamp - a.rawTimestamp); // Sort by newest first
    }, [friends, refreshTrigger]);

    return {
        conversations,
        isLoading,
        error,
        refetch
    };
}
