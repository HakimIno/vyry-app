import { apiFetch } from "@/lib/http";

export interface Conversation {
    id: string;
    friend_id: string;
    created_at: string;
    updated_at: string;
}

export async function createOrGetConversation(friendId: string): Promise<Conversation> {
    try {
        // Try to get existing conversation
        // Assuming API: GET /api/v1/conversations?friend_id=... or similar logic could be implemented
        // But typically we might just POST to "get or create" endpoint

        // For now, let's assume we post to creating a direct message channel
        const conversation = await apiFetch<Conversation>('/api/v1/conversations/direct', {
            method: 'POST',
            body: { friend_id: friendId },
            auth: true,
        });
        return conversation;
    } catch (error) {
        console.error("Failed to get/create conversation", error);
        // Fallback or re-throw depending on handling strategy
        throw error;
    }
}

export async function fetchMessages(conversationId: string, limit = 50, offset = 0): Promise<any[]> {
    return apiFetch(`/api/v1/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        auth: true,
    });
}
