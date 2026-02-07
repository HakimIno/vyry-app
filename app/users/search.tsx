import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    TextInput,
    View,
    Alert,
} from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IosButton } from "@/components/ui/ios-button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSearchUsers, useAddFriend } from "@/hooks/use-friends";
import { getAvatarUrl } from "@/components/ui/avatar-picker-sheet";

export default function SearchUserScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Search Hook
    const { data: user, isLoading, error } = useSearchUsers(debouncedQuery);
    const addFriendMutation = useAddFriend();

    // Debounce search
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 500);
        return () => clearTimeout(timer);
    }, [query]);

    const handleAddFriend = useCallback(() => {
        if (!user) return;

        if (Platform.OS !== "web") {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        addFriendMutation.mutate(user.user_id, {
            onSuccess: () => {
                Alert.alert("Request Sent", `Friend request sent to ${user.display_name || user.username}`);
                router.back();
            },
            onError: (err) => {
                Alert.alert("Error", err instanceof Error ? err.message : "Failed to add friend");
            },
        });
    }, [user, addFriendMutation, router]);

    const bgColor = isDark ? "#000000" : "#F2F2F7";
    const cardColor = isDark ? "#1C1C1E" : "#FFFFFF";
    const textColor = isDark ? "#FFFFFF" : "#000000";
    const subTextColor = isDark ? "#8E8E93" : "#8E8E93";

    return (
        <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
            <Stack.Screen
                options={{
                    title: "Add Friend",
                    headerShown: true,
                    headerLargeTitle: false,
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                }}
            />

            <View style={styles.searchContainer}>
                <View style={[styles.searchBar, { backgroundColor: isDark ? "#2C2C2E" : "#E5E5EA" }]}>
                    <Ionicons name="search" size={20} color="#8E8E93" />
                    <TextInput
                        style={[styles.searchInput, { color: textColor }]}
                        placeholder="Search by ID or Username"
                        placeholderTextColor="#8E8E93"
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {query.length > 0 && (
                        <Ionicons
                            name="close-circle"
                            size={20}
                            color="#8E8E93"
                            onPress={() => setQuery("")}
                        />
                    )}
                </View>
            </View>

            <View style={styles.content}>
                {isLoading && (
                    <ActivityIndicator size="large" color={textColor} style={{ marginTop: 20 }} />
                )}

                {/* Found User Card */}
                {user && !isLoading && (
                    <View style={[styles.userCard, { backgroundColor: cardColor }]}>
                        <Image
                            source={{ uri: user.profile_picture || getAvatarUrl(user.user_id) }}
                            style={styles.avatar}
                            contentFit="cover"
                        />
                        <View style={styles.userInfo}>
                            <ThemedText style={styles.displayName}>{user.display_name || "Unknown"}</ThemedText>
                            <ThemedText style={styles.username}>@{user.username || "no_username"}</ThemedText>
                            {user.user_id && (
                                <ThemedText style={styles.userId}>{user.user_id}</ThemedText>
                            )}
                        </View>
                        <IosButton
                            title={addFriendMutation.isPending ? "Sending..." : "Add"}
                            onPress={handleAddFriend}
                            size="medium"
                            disabled={addFriendMutation.isPending}
                        />
                    </View>
                )}

                {/* Not Found / Error */}
                {debouncedQuery.length > 2 && !isLoading && !user && !error && (
                    <ThemedText style={[styles.messageText, { color: subTextColor }]}>
                        User not found
                    </ThemedText>
                )}

                {error && (
                    <ThemedText style={[styles.messageText, { color: "red" }]}>
                        Error searching user
                    </ThemedText>
                )}

                {!debouncedQuery && (
                    <ThemedText style={[styles.messageText, { color: subTextColor }]}>
                        Enter a username or ID to search
                    </ThemedText>
                )}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        padding: 16,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 12,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 17,
        letterSpacing: -0.2,
        fontFamily: "LINESeedSansTH_Rg",
        paddingVertical: 0,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    userCard: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        gap: 16,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#E5E5EA",
    },
    userInfo: {
        flex: 1,
        gap: 2,
    },
    displayName: {
        fontSize: 18,
        fontFamily: "LINESeedSansTH_Bd",
    },
    username: {
        fontSize: 14,
        color: "#8E8E93",
        fontFamily: "LINESeedSansTH_Rg",
    },
    userId: {
        fontSize: 10,
        color: "#8E8E93",
        fontFamily: "LINESeedSansTH_Rg",
        marginTop: 2,
    },
    messageText: {
        textAlign: "center",
        marginTop: 32,
        fontSize: 16,
        fontFamily: "LINESeedSansTH_Rg",
    }
});
