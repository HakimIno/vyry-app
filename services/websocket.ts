import { getApiBaseUrl } from "@/lib/env";
import { SecureKV } from "@/lib/secure-store";

type MessageHandler = (data: unknown) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private listeners: MessageHandler[] = [];
    private reconnectInterval: ReturnType<typeof setInterval> | null = null;
    private isConnecting = false;

    async connect() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) return;
        this.isConnecting = true;

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
            if (this.reconnectInterval) {
                clearInterval(this.reconnectInterval);
                this.reconnectInterval = null;
            }
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
            this.scheduleReconnect();
        };

        this.ws.onerror = (e) => {
            // Suppress verbose error object logging. 
            // Most WS errors are connection issues handled by onclose/reconnect.
            console.log("[WS] Connection error (suppressed details)");
            this.isConnecting = false;
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.reconnectInterval) {
            clearInterval(this.reconnectInterval);
            this.reconnectInterval = null;
        }
    }

    send(data: unknown) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn("[WS] Not connected, cannot send message");
            // Optional: Queue messages?
        }
    }

    addMessageListener(handler: MessageHandler) {
        this.listeners.push(handler);
        return () => {
            this.listeners = this.listeners.filter(l => l !== handler);
        };
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
