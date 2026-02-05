import { apiFetch } from "@/lib/http";

export interface UserProfile {
    user_id: string;
    username: string | null;
    display_name: string | null;
    profile_picture: string | null;
}

export interface Friend extends UserProfile {
    status: number; // 0=Pending, 1=Accepted, 2=Blocked
    created_at: number;
}

export interface SearchUserResponse {
    user_id: string;
    username: string | null;
    display_name: string | null;
    profile_picture: string | null;
}

export const friendsApi = {
    getFriends: async (): Promise<Friend[]> => {
        return apiFetch<Friend[]>("/api/v1/friends", { auth: true });
    },

    getPendingRequests: async (): Promise<Friend[]> => {
        return apiFetch<Friend[]>("/api/v1/friends/requests", { auth: true });
    },

    searchUsers: async (query: string): Promise<SearchUserResponse> => {
        return apiFetch<SearchUserResponse>(`/api/v1/users/search?q=${encodeURIComponent(query)}`, {
            auth: true,
        });
    },

    addFriend: async (friendId: string): Promise<{ message: string }> => {
        return apiFetch<{ message: string }>("/api/v1/friends/request", {
            method: "POST",
            body: { friend_id: friendId },
            auth: true,
        });
    },

    acceptFriendRequest: async (
        requesterId: string,
        accept: boolean
    ): Promise<{ message: string }> => {
        return apiFetch<{ message: string }>("/api/v1/friends/accept", {
            method: "POST",
            body: { requester_id: requesterId, accept },
            auth: true,
        });
    },
};
