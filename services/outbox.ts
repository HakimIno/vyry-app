import { createMMKV } from "react-native-mmkv";
import { SignalService } from "./signal";
import { wsService } from "./websocket";
import { MessageStorage } from "@/features/chat/storage";
import { uuidv4 } from "@/lib/uuid";
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

export class OutboxService {
    private static instance: OutboxService;
    private isProcessing = false;

    private constructor() {
        // Listen for connection to process queue
        wsService.addConnectionListener((isConnected) => {
            if (isConnected) {
                this.processQueue();
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

        // Optimistically trigger processing
        this.processQueue();
    }

    public async processQueue() {
        if (this.isProcessing) return;

        // Check connection first
        const isConnected = await wsService.waitForConnection(1000); // Wait briefly
        if (!isConnected) {
            console.log("[Outbox] Offline, pausing processing");
            return;
        }

        this.isProcessing = true;
        console.log("[Outbox] Starting processing...");

        try {
            let queue = this.getQueue();

            // Process one by one to ensure order (Signal Protocol requirement)
            // We cannot run in parallel for the same recipient
            while (queue.length > 0) {
                const item = queue[0]; // Peek

                try {
                    console.log(`[Outbox] Processing item ${item.clientMessageId}`);

                    // Update status to sending
                    MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "sending");

                    await this.sendMessage(item);

                    // Success! Remove from queue
                    queue.shift();
                    this.saveQueue(queue);

                    // Update status to sent
                    MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "sent");

                } catch (error) {
                    console.error(`[Outbox] Failed to send item ${item.clientMessageId}`, error);

                    // Update status to failed (user can see it) but we might keep it in queue?
                    // For now, let's keep it in queue but increment retry. 
                    // If retry > MAX, move to 'dead letter' or just leave it for now.
                    // Actually, if we fail to encrypt/send, we should probably stop processing this queue 
                    // to avoid out-of-order delivery if we were to skip it.

                    item.retryCount++;
                    queue[0] = item; // Update retry count
                    this.saveQueue(queue);

                    MessageStorage.updateMessageStatus(item.conversationId, item.clientMessageId, "failed");

                    // Break loop, wait for next trigger (e.g. reconnect or manual retry)
                    break;
                }
            }
        } finally {
            this.isProcessing = false;
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
                conversation_id: item.conversationId,
                client_message_id: item.clientMessageId,
                recipient_id: item.recipientId,
                recipient_device_id: item.recipientDeviceId,
                content: contentArray,
                iv: Array.from(new Uint8Array(ciphertext.registrationId === undefined ? [] : [])),
                message_type: ciphertext.type,
                attachment_url: null,
                thumbnail_url: null,
                reply_to_message_id: null,
            }
        };

        // 3. Send via WS
        // We use send() and assume if it returns true, it's "Sent" to the wire.
        // Ideally we'd wait for an ACK from server, but that requires protocol changes.
        // For now, if WS is open and send() works, we assume success.
        const sent = wsService.send(payload);
        if (!sent) {
            throw new Error("WebSocket not connected");
        }
    }
}
