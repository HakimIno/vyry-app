import { getApiBaseUrl } from "@/lib/env";
import { SecureKV } from "@/lib/secure-store";

type MessageHandler = (data: unknown) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private listeners: MessageHandler[] = [];
    private connectionListeners: ((isConnected: boolean) => void)[] = [];
    private reconnectInterval: ReturnType<typeof setInterval> | null = null;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    private isConnecting = false;
    private manuallyClosed = false;

    async connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
        this.isConnecting = true;
        this.manuallyClosed = false;

        const token = await SecureKV.get("auth.accessToken");
        if (!token) {
            console.error("[WS] No access token found");
            this.isConnecting = false;
            return;
        }

        const baseUrl = getApiBaseUrl().replace(/^http/, "ws");
        const url = `${baseUrl}/ws/?token=${token}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("[WS] Connected");
            this.isConnecting = false;
            this.notifyConnectionListeners(true);
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
            // Start heartbeat to keep connection alive
            this.startHeartbeat();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                for (const listener of this.listeners) {
                    listener(data);
                }
            } catch (e) {
                console.error("[WS] Failed to parse message", e);
            }
        };

        this.ws.onclose = () => {
            console.log("[WS] Disconnected");
            this.isConnecting = false;
            this.ws = null;
            this.stopHeartbeat();
            this.notifyConnectionListeners(false);
            if (!this.manuallyClosed) {
                this.scheduleReconnect();
            }
        };

        this.ws.onerror = (e) => {
            console.warn("[WS] Connection error");
            this.isConnecting = false;
        };
    }

    disconnect() {
        this.manuallyClosed = true;
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    send(data: unknown): boolean {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        } else {
            console.warn("[WS] Not connected, cannot send message");
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

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                // Send a lightweight ping message to keep connection alive
                this.ws.send(JSON.stringify({ type: "Ping" }));
            }
        }, 25000); // Every 25 seconds
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private scheduleReconnect() {
        if (!this.reconnectInterval) {
            this.reconnectInterval = setInterval(() => {
                console.log("[WS] Attempting reconnect...");
                this.connect();
            }, 3000);
        }
    }
}

export const wsService = new WebSocketService();
