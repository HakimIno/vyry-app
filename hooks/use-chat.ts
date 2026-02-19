import { useState, useEffect, useCallback } from "react";
import { wsService } from "@/services/websocket";
import { SignalService } from "@/services/signal";
import { uuidv4 } from "@/lib/uuid";
import { createOrGetConversation } from "@/features/chat/api";
import { MessageStorage } from "@/features/chat/storage";
import { DEFAULT_DEVICE_ID } from "@/constants/chat";
import { ChatMessage } from "@/types/chat";
import { OutboxService } from "@/services/outbox";

export function useChat(friendId: string, friendDeviceId: number = DEFAULT_DEVICE_ID) {
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeDeviceId, setActiveDeviceId] = useState(friendDeviceId);

    // Initial Load & Discovery
    useEffect(() => {
        let mounted = true;
        const initChat = async () => {
            if (!friendId) return;
            try {
                // 1. Get conversation ID
                const conv = await createOrGetConversation(friendId);
                if (!mounted) return;
                setConversationId(conv.id);

                // SAVE MAPPING! Correctly map friendId -> conversationId
                MessageStorage.saveConversationMapping(friendId, conv.id);

                // 2. Load Local Messages
                const localMsgs = MessageStorage.getMessages(conv.id);
                setMessages(localMsgs);

                // 3. Sync Remote Messages (History) - REMOVED
                // BackgroundChatService now handles sync via WebSocket and stores to DB.
                // We just rely on MessageStorage.getMessages(conv.id) which we already called.
                // If new messages come in, the subscription below will pick them up.

                // 4. Discover active device
                try {
                    const devices = await SignalService.getInstance().getDevices(friendId);
                    if (devices.length > 0) {
                        const targetDevice = devices[devices.length - 1];
                        console.log(`[Chat] Targeted device for ${friendId}: ${targetDevice.device_id}`);
                        if (mounted) setActiveDeviceId(targetDevice.device_id);
                    }
                } catch (e) {
                    console.warn("[Chat] Failed to discover devices", e);
                }

            } catch (e) {
                console.error("Failed to init chat", e);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initChat();

        return () => { mounted = false; };
    }, [friendId, friendDeviceId]);

    // Subscribe to Storage Updates (for status changes from Outbox)
    useEffect(() => {
        if (!conversationId) return;

        const unsubscribe = MessageStorage.subscribe(() => {
            const updated = MessageStorage.getMessages(conversationId);
            setMessages(updated);

            // Mark new incoming messages as read immediately while we're viewing
            MessageStorage.markAllAsRead(conversationId);
        });

        return () => unsubscribe();
    }, [conversationId]);


    // Mark as read once when entering the chat screen
    useEffect(() => {
        if (!conversationId) return;
        MessageStorage.markAllAsRead(conversationId);
    }, [conversationId]);

    // WebSocket Listener is now handled globally by BackgroundChatService
    // We only need to ensure session exists if we are talking
    useEffect(() => {
        if (activeDeviceId && conversationId) {
            SignalService.getInstance().ensureSession(friendId, activeDeviceId).catch(err => {
                console.error("Failed to ensure session", err);
            });
        }
    }, [friendId, activeDeviceId, conversationId]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !conversationId) return;

        // Protection against race condition:
        // If we are still using default device ID, try to refresh it before sending.
        // This handles cases where user sends message before initChat active device discovery finishes.
        let targetDeviceId = activeDeviceId;
        if (targetDeviceId === DEFAULT_DEVICE_ID) {
            try {
                const devices = await SignalService.getInstance().getDevices(friendId);
                if (devices.length > 0) {
                    // Use the latest device
                    targetDeviceId = devices[devices.length - 1].device_id;
                    console.log(`[Chat] sendMessage: Resolved target device for ${friendId} to ${targetDeviceId}`);
                    setActiveDeviceId(targetDeviceId);
                }
            } catch (e) {
                console.warn("[Chat] Failed to resolve device ID before sending, falling back to default", e);
            }
        }

        const clientMessageId = uuidv4();
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMsg: ChatMessage = {
            id: clientMessageId,
            text: text,
            sender: "me",
            time: timestamp,
            isRead: true,
            status: "pending",
            timestamp: Date.now(),
        };

        // Persist — the MessageStorage.subscribe callback will update setMessages
        MessageStorage.saveMessage(conversationId, newMsg);

        try {
            await OutboxService.getInstance().enqueue(
                conversationId,
                clientMessageId,
                friendId,
                targetDeviceId,
                text
            );
        } catch (e) {
            console.error("[Chat] Failed to enqueue message", e);
            MessageStorage.updateMessageStatus(conversationId, clientMessageId, "failed");
        }
    }, [friendId, activeDeviceId, conversationId]);

    return { messages, sendMessage, loading };
}
