import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { friendsApi } from "@/features/friends/api";

export const FRIENDS_KEYS = {
    all: ["friends"] as const,
    list: () => [...FRIENDS_KEYS.all, "list"] as const,
    search: (query: string) => [...FRIENDS_KEYS.all, "search", query] as const,
};

export function useFriends() {
    return useQuery({
        queryKey: FRIENDS_KEYS.list(),
        queryFn: friendsApi.getFriends,
    });
}

export function usePendingRequests() {
    return useQuery({
        queryKey: [...FRIENDS_KEYS.all, "pending"],
        queryFn: friendsApi.getPendingRequests,
        refetchInterval: 15000, // Poll every 15 seconds
        staleTime: 10000, // Data is fresh for 10 seconds (prevents immediate refetch on mount)
        refetchOnWindowFocus: false, // Don't refetch just because app comes to foreground
    });
}

export function useSearchUsers(query: string) {
    return useQuery({
        queryKey: FRIENDS_KEYS.search(query),
        queryFn: () => friendsApi.searchUsers(query),
        enabled: query.length > 2, // Only search if query is longer than 2 chars
        retry: false,
    });
}

export function useAddFriend() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: friendsApi.addFriend,
        onSuccess: () => {
            // Invalidate friends list or incoming requests if we implement that
            queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.list() });
        },
    });
}

export function useAcceptFriend() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ requesterId, accept }: { requesterId: string; accept: boolean }) =>
            friendsApi.acceptFriendRequest(requesterId, accept),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDS_KEYS.list() });
        },
    });
}
