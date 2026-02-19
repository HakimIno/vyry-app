import { getApiBaseUrl } from "@/lib/env";
import { SecureKV } from "@/lib/secure-store";
import { encode, decode } from "@msgpack/msgpack";

type MessageHandler = (data: unknown) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private listeners: MessageHandler[] = [];
    private connectionListeners: ((isConnected: boolean) => void)[] = [];
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private isConnecting = false;
    private manuallyClosed = false;
    private reconnectAttempts = 0;

    async connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
        this.isConnecting = true;
        this.manuallyClosed = false;

        try {
            const token = await SecureKV.get("auth.accessToken");
            if (!token) {
                console.error("[WS] No access token found");
                this.isConnecting = false;
                return;
            }

            const baseUrl = getApiBaseUrl().replace(/^http/, "ws");
            const url = `${baseUrl}/ws/?token=${token}`;

            // Clean up any stale WebSocket before creating a new one
            if (this.ws) {
                this.ws.onopen = null;
                this.ws.onclose = null;
                this.ws.onerror = null;
                this.ws.onmessage = null;
                try { this.ws.close(); } catch (_) { }
                this.ws = null;
            }

            const ws = new WebSocket(url);
            ws.binaryType = "arraybuffer";

            // Set a connection timeout — if onopen hasn't fired in 8s, close and try again
            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.warn("[WS] Connection timeout, closing stale socket");
                    ws.onopen = null;
                    ws.onclose = null;
                    ws.onerror = null;
                    ws.onmessage = null;
                    try { ws.close(); } catch (_) { }
                    this.isConnecting = false;
                    if (this.ws === null) {
                        this.scheduleReconnect();
                    }
                }
            }, 8000);

            ws.onopen = () => {
                console.log("[WS] Connected");
                clearTimeout(connectionTimeout); // Clear the timeout on success
                this.ws = ws;
                this.isConnecting = false;
                this.reconnectAttempts = 0; // Reset on successful connect
                this.clearReconnectTimer();
                this.notifyConnectionListeners(true);
                this.startHeartbeat();
            };

            ws.onmessage = (event) => {
                try {
                    let data: unknown;
                    if (typeof event.data === "string") {
                        console.log(`[WS] Received TEXT message: ${event.data.length} chars`);
                        data = JSON.parse(event.data);
                    } else {
                        // Binary MessagePack
                        const buffer = event.data instanceof ArrayBuffer ? event.data : new Uint8Array(event.data as any).buffer;
                        console.log(`[WS] Received BINARY message: ${buffer.byteLength} bytes`);
                        data = decode(buffer);
                    }

                    // Debug log the decoded structure (masking binary buffers)
                    console.log("[WS] Decoded:", JSON.stringify(data, (key, value) => {
                        if (value instanceof Uint8Array || (value && value.type === 'Buffer')) return `[Binary: ${value.length} bytes]`;
                        return value;
                    }));

                    this.notifyListeners(data);
                } catch (e) {
                    console.error("[WS] Failed to parse message", e);
                }
            };

        } catch (e) {
            console.error("[WS] Connect error:", e);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    disconnect() {
        this.manuallyClosed = true;
        this.stopHeartbeat();
        this.clearReconnectTimer();
        this.reconnectAttempts = 0;
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            this.ws.onmessage = null;
            try { this.ws.close(); } catch (_) { }
            this.ws = null;
        }
        this.notifyConnectionListeners(false);
    }

    send(data: unknown): boolean {
        if (this.ws?.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(encode(data));
                return true;
            } catch (e) {
                console.error("[WS] Send error:", e);
                return false;
            }
        } else {
            console.warn("[WS] Not connected, cannot send");
            return false;
        }
    }

    /**
     * Wait for the connection to be established.
     * @param timeoutMs Max time to wait (default 5000ms)
     * @returns true if connected, false if timed out
     */
    async waitForConnection(timeoutMs = 5000): Promise<boolean> {
        if (this.ws?.readyState === WebSocket.OPEN) return true;

        // Kick off a connect if not already happening
        if (!this.isConnecting && !this.ws) {
            this.connect();
        }

        return new Promise((resolve) => {
            const start = Date.now();
            const check = setInterval(() => {
                if (this.ws?.readyState === WebSocket.OPEN) {
                    clearInterval(check);
                    resolve(true);
                }
                if (Date.now() - start > timeoutMs) {
                    clearInterval(check);
                    resolve(false);
                }
            }, 100);
        });
    }

    /**
     * Actively try to reconnect immediately (e.g., on app foreground).
     */
    ensureConnected() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
        console.log("[WS] ensureConnected: reconnecting...");
        this.reconnectAttempts = 0; // Reset backoff for manual reconnect
        this.clearReconnectTimer();
        this.connect();
    }

    addMessageListener(handler: MessageHandler) {
        this.listeners.push(handler);
        return () => {
            this.listeners = this.listeners.filter(l => l !== handler);
        };
    }

    addConnectionListener(handler: (isConnected: boolean) => void) {
        this.connectionListeners.push(handler);
        // Notify current state immediately
        handler(this.ws?.readyState === WebSocket.OPEN);
        return () => {
            this.connectionListeners = this.connectionListeners.filter(l => l !== handler);
        };
    }

    private notifyConnectionListeners(isConnected: boolean) {
        for (const listener of this.connectionListeners) {
            try {
                listener(isConnected);
            } catch (e) {
                console.error("[WS] Connection listener error", e);
            }
        }
    }

    private notifyListeners(data: unknown) {
        for (const listener of this.listeners) {
            try {
                listener(data);
            } catch (e) {
                console.error("[WS] Message listener error", e);
            }
        }
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                this.ws.send(encode({ type: "Ping", payload: {} }));
            }
        }, 25000);
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private scheduleReconnect() {
        this.clearReconnectTimer();
        // Exponential backoff: 1s, 2s, 4s, 8s, max 15s
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
        this.reconnectAttempts++;
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, delay);
    }
}

export const wsService = new WebSocketService();
