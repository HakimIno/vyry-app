import { useState, useEffect, useCallback } from "react";
import { wsService } from "@/services/websocket";
import { SignalService } from "@/services/signal";
import { uuidv4 } from "@/lib/uuid";
import { Buffer } from "buffer";
import { createOrGetConversation, fetchMessages } from "@/features/chat/api";
import { MessageStorage } from "@/features/chat/storage";
import { DEFAULT_DEVICE_ID } from "@/constants/chat";

export interface ChatMessage {
    id: string;
    text: string;
    sender: "me" | "them";
    time: string;
    type?: "text" | "image";
}

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

                // 2. Load Local Messages
                const localMsgs = MessageStorage.getMessages(conv.id);
                setMessages(localMsgs);

                // 3. Sync Remote Messages (History)
                try {
                    const remoteMsgs: any[] = await fetchMessages(conv.id);

                    // Filter out messages we already have
                    const existingIds = new Set(localMsgs.map(m => m.id));
                    const newRemoteMsgs = remoteMsgs.filter(m => !existingIds.has(m.client_message_id || m.message_id.toString()));

                    if (newRemoteMsgs.length > 0) {
                        // Sort by time ASC for correct decryption order (ratchet)
                        newRemoteMsgs.sort((a, b) => a.sent_at - b.sent_at);

                        const processedMsgs: ChatMessage[] = [];

                        for (const msg of newRemoteMsgs) {
                            try {
                                if (!msg.content) continue;

                                // Convert content to Uint8Array
                                let contentBuffer: Uint8Array;
                                if (Array.isArray(msg.content)) {
                                    contentBuffer = new Uint8Array(msg.content);
                                } else {
                                    continue;
                                }

                                const decrypted = await SignalService.getInstance().decryptMessage(
                                    msg.sender_id,
                                    msg.sender_device_id,
                                    contentBuffer,
                                    msg.message_type
                                );

                                const chatMsg: ChatMessage = {
                                    id: msg.client_message_id || msg.message_id.toString(),
                                    text: decrypted,
                                    sender: msg.sender_id === friendId ? "them" : "me", // Assuming sender_id is correct
                                    time: new Date(msg.sent_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    type: "text", // Default to text for now
                                };
                                processedMsgs.push(chatMsg);
                            } catch (e) {
                                console.warn(`Failed to decrypt message ${msg.message_id}`, e);
                                // Insert placeholder so the chat list updates/shows something
                                processedMsgs.push({
                                    id: msg.client_message_id || msg.message_id.toString(),
                                    text: "🔒 Error decrypting message",
                                    sender: msg.sender_id === friendId ? "them" : "me",
                                    time: new Date(msg.sent_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                    type: "text",
                                });
                            }
                        }

                        if (processedMsgs.length > 0) {
                            MessageStorage.saveMessages(conv.id, processedMsgs);
                            // Refresh valid messages from storage to ensure sorted/deduped
                            const updatedLocal = MessageStorage.getMessages(conv.id);
                            setMessages(updatedLocal);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch/process history", e);
                }

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

    // WebSocket Listener
    useEffect(() => {
        if (!conversationId) return;

        const removeListener = wsService.addMessageListener(async (data: unknown) => {
            const msg = data as {
                type: string;
                payload?: {
                    sender_id?: string;
                    sender_device_id?: number;
                    content?: unknown;
                    message_type?: number;
                    client_message_id?: string;
                    [key: string]: unknown;
                };
            };

            if (msg.type === "SignalMessage" && msg.payload) {
                const payload = msg.payload;
                if (payload.sender_id !== friendId) return;

                if (!payload.content || typeof payload.message_type !== 'number' || !payload.sender_id) return;

                try {
                    let contentBuffer: Uint8Array;
                    if (Array.isArray(payload.content)) {
                        contentBuffer = new Uint8Array(payload.content as number[]);
                    } else {
                        return;
                    }

                    const decrypted = await SignalService.getInstance().decryptMessage(
                        payload.sender_id,
                        payload.sender_device_id || 1,
                        contentBuffer,
                        payload.message_type
                    );

                    const newMsg: ChatMessage = {
                        id: payload.client_message_id || uuidv4(),
                        text: decrypted,
                        sender: "them",
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    };

                    setMessages(prev => {
                        const updated = [...prev, newMsg];
                        // Persist immediately
                        MessageStorage.saveMessage(conversationId, newMsg);
                        return updated;
                    });
                } catch (_e) {
                    // console.error("Failed to decrypt", _e);
                }
            }
        });

        if (activeDeviceId) {
            SignalService.getInstance().ensureSession(friendId, activeDeviceId).catch(err => {
                console.error("Failed to ensure session", err);
            });
        }

        return () => {
            removeListener();
        };
    }, [friendId, activeDeviceId, conversationId]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !conversationId) return;

        const clientMessageId = uuidv4();
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const newMsg: ChatMessage = {
            id: clientMessageId,
            text: text,
            sender: "me",
            time: timestamp,
        };

        // UI Update & Persist
        setMessages(prev => {
            const updated = [...prev, newMsg];
            MessageStorage.saveMessage(conversationId, newMsg);
            return updated;
        });

        try {
            const ciphertext = await SignalService.getInstance().encryptMessage(friendId, activeDeviceId, text);

            const contentBody = ciphertext.body;
            let contentArray: number[] = [];

            // Handle different body types safely
            const contentBodyAny = contentBody as unknown;

            if (contentBodyAny instanceof ArrayBuffer) {
                contentArray = Array.from(new Uint8Array(contentBodyAny));
            } else if (typeof contentBody === 'string') {
                contentArray = Array.from(Buffer.from(contentBody, 'binary'));
            } else {
                // biome-ignore lint/suspicious/noExplicitAny: library types are inconsistent
                contentArray = Array.from(new Uint8Array(contentBody as any));
            }

            const payload = {
                type: "SignalMessage",
                payload: {
                    conversation_id: conversationId,
                    client_message_id: clientMessageId,
                    recipient_id: friendId,
                    recipient_device_id: activeDeviceId,
                    content: contentArray,
                    iv: Array.from(new Uint8Array(ciphertext.registrationId === undefined ? [] : [])),
                    message_type: ciphertext.type,
                    attachment_url: null,
                    thumbnail_url: null,
                    reply_to_message_id: null,
                }
            };

            wsService.send(payload);

        } catch (e) {
            console.error("Failed to send message", e);
        }
    }, [friendId, activeDeviceId, conversationId]);

    return { messages, sendMessage, loading };
}
