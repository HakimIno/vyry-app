import { useState, useEffect, useCallback, useRef } from 'react';
import { useFriends } from '@/hooks/use-friends';
import { MessageStorage } from '@/features/chat/storage';
import { Conversation } from '@/types/chat';

export function useConversations() {
    const { data: friends, isLoading, error, refetch } = useFriends();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const friendsRef = useRef(friends);
    friendsRef.current = friends;

    // Build conversations from friends + storage data
    const buildConversations = useCallback((): Conversation[] => {
        const currentFriends = friendsRef.current;
        if (!currentFriends) return [];

        return currentFriends.map(friend => {
            const convId = MessageStorage.getConversationId(friend.user_id);
            const lastMsg = convId ? MessageStorage.getLastMessage(convId) : undefined;
            const unreadCount = convId ? MessageStorage.getUnreadCount(convId) : 0;

            let timestamp = new Date(friend.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let lastMessageText = "Start a conversation";
            let rawTimestamp = 0;

            if (lastMsg) {
                const timestampVal = lastMsg.timestamp || Date.now();
                const date = new Date(timestampVal);
                const now = new Date();
                const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

                timestamp = isToday
                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : date.toLocaleDateString();

                lastMessageText = lastMsg.type === 'image' ? 'Sent an image' : lastMsg.text;
                rawTimestamp = timestampVal;
            }

            return {
                id: friend.user_id,
                name: friend.display_name || friend.username || "Unknown",
                avatarSeed: friend.user_id,
                avatarUrl: friend.profile_picture || undefined,
                lastMessage: lastMessageText,
                timestamp,
                unreadCount,
                isPinned: false,
                isGroup: false,
                isOnline: false,
                rawTimestamp,
            } as Conversation & { rawTimestamp: number };
        }).sort((a, b) => b.rawTimestamp - a.rawTimestamp);
    }, []); // No deps — reads from ref

    // Rebuild when friends data changes
    useEffect(() => {
        setConversations(buildConversations());
    }, [friends, buildConversations]);

    // Subscribe to storage updates — rebuild conversations when messages change
    useEffect(() => {
        const unsubscribe = MessageStorage.subscribe(() => {
            setConversations(buildConversations());
        });
        return unsubscribe;
    }, [buildConversations]);

    return {
        conversations,
        isLoading,
        error,
        refetch,
    };
}
