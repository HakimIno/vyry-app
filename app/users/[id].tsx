import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from "react-native";
import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSearchUsers } from "@/hooks/use-friends";
import { getAvatarUrl } from "@/components/ui/avatar-picker-sheet";

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Reusing search hook to fetch user by ID
    const { data: user, isLoading, error } = useSearchUsers(id || "");

    const bgColor = isDark ? "#000000" : "#F2F2F7";
    const textColor = isDark ? "#FFFFFF" : "#000000";
    const subTextColor = isDark ? "#8E8E93" : "#8E8E93";

    if (!id) {
        return (
            <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
                <ThemedText>Invalid User ID</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
            <Stack.Screen
                options={{
                    title: user?.display_name || "Profile",
                    headerShown: true,
                    headerLargeTitle: false,
                    headerStyle: { backgroundColor: bgColor },
                    headerTintColor: textColor,
                    headerBackTitle: "Back",
                }}
            />

            {isLoading && (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={textColor} />
                </View>
            )}

            {error && (
                <View style={styles.center}>
                    <ThemedText style={{ color: "red" }}>Failed to load profile</ThemedText>
                </View>
            )}

            {user && (
                <View style={styles.content}>
                    <Image
                        source={{ uri: user.profile_picture || getAvatarUrl(user.user_id) }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                    />

                    <View style={styles.info}>
                        <ThemedText style={styles.displayName}>{user.display_name || "Unknown"}</ThemedText>
                        <ThemedText style={styles.username}>@{user.username || "no_username"}</ThemedText>
                    </View>

                    <View style={styles.section}>
                        <ThemedText style={[styles.label, { color: subTextColor }]}>UserID</ThemedText>
                        <ThemedText style={[styles.value, { color: textColor }]}>{user.user_id}</ThemedText>
                    </View>
                </View>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    content: {
        alignItems: "center",
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    avatar: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: "#E5E5EA",
        marginBottom: 20,
    },
    info: {
        alignItems: "center",
        marginBottom: 32,
    },
    displayName: {
        fontSize: 24,
        fontFamily: "LINESeedSansTH_Bd",
        marginBottom: 8,
        textAlign: "center",
    },
    username: {
        fontSize: 16,
        color: "#8E8E93",
        fontFamily: "LINESeedSansTH_Rg",
    },
    section: {
        width: "100%",
        backgroundColor: "rgba(142, 142, 147, 0.12)",
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
        textTransform: "uppercase",
    },
    value: {
        fontSize: 16,
        fontFamily: "LINESeedSansTH_Rg",
    },
});
