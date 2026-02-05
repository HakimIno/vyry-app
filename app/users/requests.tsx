import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
    ActivityIndicator,
    FlatList,
    Platform,
    StyleSheet,
    View,
    Alert,
    Pressable,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IosButton } from "@/components/ui/ios-button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { usePendingRequests, useAcceptFriend } from "@/hooks/use-friends";
import { getAvatarUrl } from "@/components/ui/avatar-picker-sheet";
import type { Friend } from "@/features/friends/api";

export default function FriendRequestsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    const { data: requests, isLoading, refetch } = usePendingRequests();
    const acceptMutation = useAcceptFriend();

    const handleAction = useCallback((requesterId: string, accept: boolean, name: string) => {
        if (Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        acceptMutation.mutate(
            { requesterId, accept },
            {
                onSuccess: () => {
                    Alert.alert(
                        accept ? "Accepted" : "Rejected",
                        accept ? `You are now friends with ${name}` : `Friend request from ${name} rejected`
                    );
                    refetch(); // Refresh list
                },
                onError: (err) => {
                    Alert.alert("Error", "Failed to process request");
                }
            }
        );
    }, [acceptMutation, refetch]);

    const renderItem = ({ item }: { item: Friend }) => (
        <View style={[styles.requestItem, { borderBottomColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
            <Pressable
                style={styles.profileClickArea}
                onPress={() => router.push(`/users/${item.user_id}`)}
            >
                <Image
                    source={{ uri: item.profile_picture || getAvatarUrl(item.user_id) }}
                    style={styles.avatar}
                />
                <View style={styles.info}>
                    <ThemedText style={styles.name}>{item.display_name || item.username}</ThemedText>
                    <ThemedText style={styles.username}>@{item.username}</ThemedText>
                </View>
            </Pressable>
            <View style={styles.actions}>
                <IosButton
                    title="Confirm"
                    variant="primary"
                    onPress={() => handleAction(item.user_id, true, item.display_name || item.username || "")}
                    style={styles.actionButton}
                />
                <IosButton
                    title="Delete"
                    variant="secondary"
                    onPress={() => handleAction(item.user_id, false, item.display_name || item.username || "")}
                    style={styles.actionButton}
                />
            </View>
        </View>
    );

    const bgColor = isDark ? "#000000" : "#F2F2F7";
    const textColor = isDark ? "#FFFFFF" : "#000000";

    return (
        <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
            <Stack.Screen
                options={{
                    title: "Friend Requests",
                    headerShown: true,
                    headerLargeTitle: false,
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />



            {isLoading ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <FlatList
                    data={requests}
                    keyExtractor={(item) => item.user_id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <ThemedText style={styles.emptyText}>No pending requests</ThemedText>
                        </View>
                    }
                />
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: 16,
    },
    requestItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    profileClickArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
        backgroundColor: "#E1E1E1",
    },
    info: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: "600",
    },
    username: {
        fontSize: 14,
        color: "#8E8E93",
    },
    actions: {
        flexDirection: "row",
        gap: 8,
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        minHeight: 32,
    },
    emptyState: {
        padding: 32,
        alignItems: "center",
    },
    emptyText: {
        fontSize: 16,
        color: "#8E8E93",
    },
});
