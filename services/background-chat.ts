import { wsService } from "./websocket";
import { SignalService } from "./signal";
import { MessageStorage } from "@/features/chat/storage";
import { ChatMessage } from "@/types/chat";
import { uuidv4, ensureUuidString } from "@/lib/uuid";

export class BackgroundChatService {
    private static instance: BackgroundChatService;
    private isInitialized = false;

    private constructor() { }

    public static getInstance(): BackgroundChatService {
        if (!BackgroundChatService.instance) {
            BackgroundChatService.instance = new BackgroundChatService();
        }
        return BackgroundChatService.instance;
    }

    public init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        console.log("[BackgroundChat] Initializing global message handler...");

        // Listen for incoming messages globally
        wsService.addMessageListener(async (data: unknown) => {
            await this.handleIncomingMessage(data);
        });

        // Trigger Sync on connection
        wsService.addConnectionListener((isConnected) => {
            if (isConnected) {
                this.triggerSync();
            }
        });
    }

    public async triggerSync() {
        try {
            const lastId = MessageStorage.getLastServerMessageId();
            console.log(`[BackgroundChat] Triggering sync from last_message_id: ${lastId}`);

            wsService.send({
                type: "SyncRequest",
                payload: {
                    last_message_id: lastId
                }
            });
        } catch (e) {
            console.error("[BackgroundChat] Failed to trigger sync", e);
        }
    }

    private async handleIncomingMessage(data: unknown) {
        // Server uses serde adjacently-tagged format: { "type": "...", "payload": { ... } }
        const msg = data as {
            type: string;
            payload?: Record<string, unknown>;
        };

        if (!msg.type || !msg.payload) return;

        if (msg.type === "SyncResponse") {
            const syncPayload = msg.payload as { messages?: unknown[] };
            if (Array.isArray(syncPayload.messages)) {
                console.log(`[BackgroundChat] Received SyncResponse with ${syncPayload.messages.length} messages`);
                for (const syncMsg of syncPayload.messages) {
                    await this.processSyncMessage(syncMsg);
                }
            }
            return;
        }

        if (msg.type !== "SignalMessage") return;

        const payload = msg.payload as {
            sender_id?: string;
            sender_device_id?: number;
            content?: unknown;
            message_type?: number;
            client_message_id?: string;
            conversation_id?: string;
            message_id?: number | string;
            [key: string]: unknown;
        };
        await this.processSignalPayload(payload, payload.message_id);
    }

    private async processSyncMessage(syncMsg: any) {
        try {
            // syncMsg structure from server: SyncMessageDto
            // { message_id, conversation_id, client_message_id, sender_id, content: [], ... }

            const messageId = syncMsg.client_message_id || uuidv4();
            const serverId = syncMsg.message_id; // i64 from server

            // 1. Check for duplicate processing
            const existingConvId = MessageStorage.getConversationId(syncMsg.sender_id);
            if (existingConvId) {
                const existingMsgs = MessageStorage.getMessages(existingConvId);
                const existing = existingMsgs.find(m => m.id === messageId);
                if (existing) {
                    // Update server_id if missing?
                    if (!existing.serverId && serverId) {
                        // TODO: We could update it, but storage.saveMessage handles replace.
                        // We should respect local state if possible.
                        // For now, let's assume we skip if we have it, OR we overwrite to ensure consistency.
                        // But overwriting might reset 'isRead'. 
                        // Check if we need to update server_id.
                        // If we skip, we won't verify the hash/content.
                        console.log(`[BackgroundChat] Sync message ${messageId} already exists, skipping.`);
                        return;
                    }
                    return;
                }
            }

            console.log(`[BackgroundChat] Processing sync message from ${syncMsg.sender_id}`);

            // Decrypt
            let contentBuffer: Uint8Array;
            if (Array.isArray(syncMsg.content)) {
                contentBuffer = new Uint8Array(syncMsg.content);
            } else {
                return;
            }

            const decrypted = await SignalService.getInstance().decryptMessage(
                syncMsg.sender_id,
                syncMsg.sender_device_id || 1,
                contentBuffer,
                syncMsg.message_type
            );

            // Conversation Mapping
            const currentConvId = MessageStorage.getConversationId(syncMsg.sender_id);
            let conversationId = syncMsg.conversation_id;

            if (!conversationId && currentConvId) {
                conversationId = currentConvId;
            }

            if (!conversationId) {
                // Fallback: create mapping if missing?
                // Or we accept the conversation_id from server
                conversationId = syncMsg.conversation_id || uuidv4(); // Should use server's conv id if available
            }

            if (conversationId) {
                MessageStorage.saveConversationMapping(syncMsg.sender_id, conversationId);
            }

            const newMsg: ChatMessage = {
                id: messageId,
                text: decrypted,
                sender: "them",
                time: new Date(syncMsg.sent_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: syncMsg.sent_at * 1000,
                isRead: false,
                status: "read",
                serverId: serverId
            };

            MessageStorage.saveMessage(conversationId, newMsg);

        } catch (e) {
            console.error("[BackgroundChat] Failed to process sync message", e);
        }
    }

    // Refactored from handleIncomingMessage to allow reuse or cleaner code
    private async processSignalPayload(payload: any, originalMessageId?: number | string) {
        // Normalize UUIDs (MessagePack might send them as Uint8Array/Array)
        const senderId = ensureUuidString(payload.sender_id);
        const conversationId = ensureUuidString(payload.conversation_id);
        const clientMessageId = ensureUuidString(payload.client_message_id);

        if (!senderId || !payload.content || typeof payload.message_type !== 'number') {
            console.warn("[BackgroundChat] Invalid payload structure", { senderId, hasContent: !!payload.content, type: payload.message_type });
            return;
        }

        const messageId = clientMessageId || (originalMessageId ? originalMessageId.toString() : uuidv4());

        // 1. Check for duplicate processing BEFORE decryption to avoid Ratchet errors
        // (If we already have this message ID, we must not decrypt again)
        const existingConvId = MessageStorage.getConversationId(senderId);
        if (existingConvId) {
            const existingMsgs = MessageStorage.getMessages(existingConvId);
            if (existingMsgs.some(m => m.id === messageId)) {
                console.log(`[BackgroundChat] Duplicate message ${messageId}, skipping`);
                return;
            }
        }

        console.log(`[BackgroundChat] Received message from ${senderId}`);

        try {
            // Decrypt
            let contentBuffer: Uint8Array;
            if (Array.isArray(payload.content)) {
                contentBuffer = new Uint8Array(payload.content as number[]);
            } else if (payload.content instanceof Uint8Array) {
                contentBuffer = payload.content;
            } else {
                console.warn("[BackgroundChat] Invalid content format");
                return;
            }

            const decrypted = await SignalService.getInstance().decryptMessage(
                senderId,
                payload.sender_device_id || 1,
                contentBuffer,
                payload.message_type
            );

            // Check mapping again (in case it changed during async)
            const currentConvId = MessageStorage.getConversationId(senderId);
            let finalConversationId = conversationId;

            if (!finalConversationId && currentConvId) {
                finalConversationId = currentConvId;
            }

            // If still no conversation ID, look for mapping again or create it
            if (!finalConversationId) {
                console.warn("[BackgroundChat] Received message but no conversation ID found locally");
                return;
            }

            // Ensure mapping exists
            if (!currentConvId) {
                MessageStorage.saveConversationMapping(senderId, finalConversationId);
            }

            const newMsg: ChatMessage = {
                id: messageId,
                text: decrypted,
                sender: "them",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now(),
                isRead: false, // Default to unread!
                status: "read" // 'read' status for them means we received it? 
            };

            // Save to storage FIRST
            MessageStorage.saveMessage(finalConversationId, newMsg);

            console.log(`[BackgroundChat] Saved message: ${newMsg.text.substring(0, 10)}...`);

        } catch (e: any) {
            // Suppress MessageCounterError for duplicates running in parallel
            if (e.name === 'MessageCounterError' || e.message?.includes('counter was repeated')) {
                console.log(`[BackgroundChat] Duplicate message detected during decryption (MessageCounterError), skipping.`);
                return;
            }
            console.error("[BackgroundChat] Failed to process signal payload:", e);
        }
    }
}
