import { createMMKV } from "react-native-mmkv";
import { SignalService } from "./signal";
import { wsService } from "./websocket";
import { MessageStorage } from "@/features/chat/storage";
import { uuidv4, parse } from "@/lib/uuid";
import { Buffer } from "buffer";

interface OutboxItem {
    id: string; // Internal outbox ID
    conversationId: string;
    clientMessageId: string;
    recipientId: string;
    recipientDeviceId: number;
    text: string; // Plaintext content
    timestamp: number;
    retryCount: number;
}

const outboxStorage = createMMKV({
    id: "chat-outbox",
    encryptionKey: "secure-outbox-key",
});

const QUEUE_KEY = "outbox_queue";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

export class OutboxService {
    private static instance: OutboxService;
    private isProcessing = false;
    private retryTimer: ReturnType<typeof setTimeout> | null = null;

    private constructor() {
        // Listen for connection to process queue
        wsService.addConnectionListener((isConnected) => {
            if (isConnected) {
                this.scheduleProcess(0); // Flush immediately on connect
            }
        });
    }

    public static getInstance(): OutboxService {
        if (!OutboxService.instance) {
            OutboxService.instance = new OutboxService();
        }
        return OutboxService.instance;
    }

    private getQueue(): OutboxItem[] {
        const str = outboxStorage.getString(QUEUE_KEY);
        return str ? JSON.parse(str) : [];
    }

    private saveQueue(queue: OutboxItem[]) {
        outboxStorage.set(QUEUE_KEY, JSON.stringify(queue));
    }

    /**
     * Schedule a processQueue call after `delayMs`.
     * Deduplicates — only one pending timer at a time.
     */
    private scheduleProcess(delayMs: number) {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
            this.retryTimer = null;
            this.processQueue();
        }, delayMs);
    }

    public async enqueue(
        conversationId: string,
        clientMessageId: string,
        recipientId: string,
        recipientDeviceId: number,
        text: string
    ) {
        const item: OutboxItem = {
            id: uuidv4(),
            conversationId,
            clientMessageId,
            recipientId,
            recipientDeviceId,
            text,
            timestamp: Date.now(),
            retryCount: 0,
        };

        const queue = this.getQueue();
        queue.push(item);
        this.saveQueue(queue);

        console.log(`[Outbox] Enqueued message ${clientMessageId}`);

        // Trigger processing
        this.processQueue();
    }

    public async processQueue() {
        // ──────────────────────────────────────────────────────
        // CRITICAL: Set flag FIRST to prevent re-entrancy.
        // Previous bug: flag was set AFTER the async waitForConnection,
        // allowing multiple concurrent processQueue calls.
        // ──────────────────────────────────────────────────────
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            const queue = this.getQueue();
            if (queue.length === 0) {
                return; // Nothing to do
            }

            // Wait for WebSocket to be ready
            const isConnected = await wsService.waitForConnection(3000);

            // If offline, drain queue actively by incrementing retry counts and failing them
            if (!isConnected) {
                console.log("[Outbox] Offline, forcefully failing pending messages to show Retry button...");
                this.handleOfflineQueue();
                return;
            }

            console.log(`[Outbox] Starting processing... (${queue.length} items)`);
            await this.drainQueue();

        } finally {
            this.isProcessing = false;
        }
    }

    private handleOfflineQueue() {
        let queue = this.getQueue();
        let queueChanged = false;

        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            item.retryCount++;

            if (item.retryCount >= MAX_RETRIES) {
                console.warn(`[Outbox] Message ${item.clientMessageId} exceeded ${MAX_RETRIES} retries while offline, failing`);
                MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "failed");
                // Remove from queue
                queue.splice(i, 1);
                i--; // Adjust index after removal
                queueChanged = true;
            } else {
                console.log(`[Outbox] Offline retry attempt ${item.retryCount}/${MAX_RETRIES} for ${item.clientMessageId}`);
                queueChanged = true;
            }
        }

        if (queueChanged) {
            this.saveQueue(queue);
            // Schedule another check if there are still items
            if (queue.length > 0) {
                this.scheduleProcess(RETRY_DELAY_MS);
            }
        }
    }

    private async drainQueue() {
        let queue = this.getQueue();

        while (queue.length > 0) {
            const item = queue[0];

            // Skip items that have exceeded max retries
            if (item.retryCount >= MAX_RETRIES) {
                console.warn(`[Outbox] Message ${item.clientMessageId} exceeded ${MAX_RETRIES} retries, dropping`);
                MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "failed");
                queue.shift();
                this.saveQueue(queue);
                continue;
            }

            try {
                console.log(`[Outbox] Processing item ${item.clientMessageId} (attempt ${item.retryCount + 1})`);

                // Update status to sending
                MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "sending");

                await this.sendMessage(item);

                // Success! Remove from queue
                queue.shift();
                this.saveQueue(queue);

                // Update status to sent
                MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "sent");
                console.log(`[Outbox] ✓ Sent ${item.clientMessageId}`);

            } catch (error) {
                console.error(`[Outbox] ✗ Failed ${item.clientMessageId}:`, error);

                item.retryCount++;
                queue[0] = item;
                this.saveQueue(queue);

                // If WS disconnected mid-send, schedule retry (don't mark as failed yet)
                if (item.retryCount < MAX_RETRIES) {
                    MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "pending");
                    console.log(`[Outbox] Will retry in ${RETRY_DELAY_MS}ms (attempt ${item.retryCount}/${MAX_RETRIES})`);
                    this.scheduleProcess(RETRY_DELAY_MS);
                } else {
                    MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "failed");
                    // Remove failed item to unblock the queue for other messages
                    queue.shift();
                    this.saveQueue(queue);
                    this.scheduleProcess(100);
                }

                // Stop processing to maintain message order
                break;
            }
        }
    }

    private async sendMessage(item: OutboxItem) {
        // 1. Encrypt
        const ciphertext = await SignalService.getInstance().encryptMessage(
            item.recipientId,
            item.recipientDeviceId,
            item.text
        );

        // 2. Prepare Payload
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
                conversation_id: parse(item.conversationId),
                client_message_id: parse(item.clientMessageId),
                recipient_id: parse(item.recipientId),
                recipient_device_id: item.recipientDeviceId,
                content: contentArray,
                iv: Array.from(new Uint8Array(ciphertext.registrationId === undefined ? [] : [])),
                message_type: ciphertext.type,
                attachment_url: null,
                thumbnail_url: null,
                reply_to_message_id: null,
            }
        };

        // 3. Send via WS — verify connection is still alive before sending
        if (!wsService.send(payload)) {
            throw new Error("WebSocket not connected");
        }
    }

    public async retry(
        conversationId: string,
        clientMessageId: string,
        recipientId: string,
        recipientDeviceId: number,
        text: string
    ) {
        console.log(`[Outbox] Retry request for ${clientMessageId}`);

        // 1. Check if already in queue
        const queue = this.getQueue();
        const existingIndex = queue.findIndex(i => i.clientMessageId === clientMessageId);

        if (existingIndex !== -1) {
            console.log(`[Outbox] Message ${clientMessageId} already in queue, resetting retries`);
            const item = queue[existingIndex];
            item.retryCount = 0;
            // Update details in case they changed (e.g. new active device ID)
            item.recipientId = recipientId;
            item.recipientDeviceId = recipientDeviceId;
            item.text = text;
            item.timestamp = Date.now();

            // Move to end of queue
            queue.splice(existingIndex, 1);
            queue.push(item);

            this.saveQueue(queue);
            MessageStorage.updateMessageStatus(conversationId, clientMessageId, "pending");
            this.processQueue();
            return;
        }

        // 2. Not in queue, re-enqueue
        console.log(`[Outbox] Re-enqueuing message ${clientMessageId} for retry`);
        MessageStorage.updateMessageStatus(conversationId, clientMessageId, "pending");

        await this.enqueue(
            conversationId,
            clientMessageId,
            recipientId,
            recipientDeviceId,
            text
        );
    }
}
