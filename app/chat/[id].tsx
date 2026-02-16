import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect, useCallback } from "react";
import {
    Keyboard,
    Platform,
    StyleSheet,
    TextInput,
    View,
    TouchableOpacity,
    ActivityIndicator,
    Text,
    FlatList,
    type ListRenderItemInfo,
} from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAvatarUrl } from "@/components/ui/avatar-picker-sheet";
import { WHATSAPP_GREEN, DEFAULT_DEVICE_ID } from "@/constants/chat";
import { useChat } from "@/hooks/use-chat";
import { ChatMessage } from "@/types/chat";

// ─── Font Family ────────────────────────────────────────────
const FONT = {
    thin: "LINESeedSansTH_Th",
    regular: "LINESeedSansTH_Rg",
    bold: "LINESeedSansTH_Bd",
    extraBold: "LINESeedSansTH_XBd",
    heavy: "LINESeedSansTH_He",
};

// ─── Theme Palette ──────────────────────────────────────────
const palette = {
    light: {
        bg: "#FFFFFF",
        headerBg: "#FFFFFF",
        text: "#1A1A1A",
        textSecondary: "#999999",
        bubbleMe: WHATSAPP_GREEN,
        bubbleMeText: "#FFFFFF",
        bubbleThem: "#F5F5F5",
        bubbleThemText: "#1A1A1A",
        inputBg: "#F5F5F5",
        inputBarBg: "#FFFFFF",
        border: "rgba(0,0,0,0.06)",
        accent: WHATSAPP_GREEN,
        timeMe: "rgba(255,255,255,0.6)",
        timeThem: "#BBBBBB",
    },
    dark: {
        bg: "#0A0A0A",
        headerBg: "#0A0A0A",
        text: "#FFFFFF",
        textSecondary: "#666666",
        bubbleMe: WHATSAPP_GREEN,
        bubbleMeText: "#FFFFFF",
        bubbleThem: "#1C1C1E",
        bubbleThemText: "#FFFFFF",
        inputBg: "#1C1C1E",
        inputBarBg: "#0A0A0A",
        border: "rgba(255,255,255,0.06)",
        accent: WHATSAPP_GREEN,
        timeMe: "rgba(255,255,255,0.5)",
        timeThem: "#555555",
    },
};

export default function ChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";
    const theme = isDark ? palette.dark : palette.light;
    const insets = useSafeAreaInsets();

    const { messages, sendMessage, loading } = useChat(id, DEFAULT_DEVICE_ID);
    const [inputText, setInputText] = useState("");
    const flatListRef = useRef<FlatList<ChatMessage>>(null);
    const inputRef = useRef<TextInput>(null);

    // ─── Keyboard-aware bottom spacing ──────────────────────
    const keyboardHeight = useSharedValue(0);

    useEffect(() => {
        const showEvent =
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent =
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const onShow = Keyboard.addListener(showEvent, (e) => {
            keyboardHeight.value = withTiming(
                e.endCoordinates.height - insets.bottom,
                { duration: Platform.OS === "ios" ? 280 : 200, easing: Easing.out(Easing.cubic) }
            );
            // Scroll to bottom when keyboard opens
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        });

        const onHide = Keyboard.addListener(hideEvent, () => {
            keyboardHeight.value = withTiming(0, {
                duration: Platform.OS === "ios" ? 280 : 200,
                easing: Easing.out(Easing.cubic),
            });
        });

        return () => {
            onShow.remove();
            onHide.remove();
        };
    }, [insets.bottom, keyboardHeight]);

    const animatedBottomStyle = useAnimatedStyle(() => ({
        paddingBottom: keyboardHeight.value,
    }));

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = useCallback(() => {
        if (!inputText.trim()) return;
        sendMessage(inputText.trim());
        setInputText("");
    }, [inputText, sendMessage]);

    // ─── Render message ─────────────────────────────────────
    const renderMessage = useCallback(
        ({ item }: ListRenderItemInfo<ChatMessage>) => {
            const isMe = item.sender === "me";
            return (
                <View
                    style={[
                        styles.bubbleRow,
                        isMe ? styles.bubbleRowMe : styles.bubbleRowThem,
                    ]}
                >
                    <View
                        style={[
                            styles.bubble,
                            isMe
                                ? {
                                    backgroundColor: theme.bubbleMe,
                                    borderBottomRightRadius: 4,
                                }
                                : {
                                    backgroundColor: theme.bubbleThem,
                                    borderBottomLeftRadius: 4,
                                },
                        ]}
                    >
                        <Text
                            style={[
                                styles.bubbleText,
                                {
                                    color: isMe
                                        ? theme.bubbleMeText
                                        : theme.bubbleThemText,
                                },
                            ]}
                        >
                            {item.text}
                        </Text>
                        <View style={styles.bubbleFooter}>
                            <Text
                                style={[
                                    styles.timeText,
                                    {
                                        color: isMe
                                            ? theme.timeMe
                                            : theme.timeThem,
                                    },
                                ]}
                            >
                                {item.time}
                            </Text>
                            {isMe && (
                                <Ionicons
                                    name={
                                        item.status === "pending" ||
                                            item.status === "sending"
                                            ? "time-outline"
                                            : item.status === "failed"
                                                ? "alert-circle-outline"
                                                : item.status === "read"
                                                    ? "checkmark-done-outline"
                                                    : "checkmark-outline"
                                    }
                                    size={12}
                                    color={
                                        item.status === "read"
                                            ? "#4FC3F7"
                                            : theme.timeMe
                                    }
                                    style={{ marginLeft: 3 }}
                                />
                            )}
                        </View>
                    </View>
                </View>
            );
        },
        [theme]
    );

    const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

    return (
        <ThemedView style={[styles.container, { backgroundColor: theme.bg }]}>
            {/* ─── Header ──────────────────────────────────── */}
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: "",
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: theme.headerBg },
                    headerTintColor: theme.text,
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={styles.headerBackBtn}
                        >
                            <Ionicons
                                name="chevron-back"
                                size={26}
                                color={theme.text}
                            />
                        </TouchableOpacity>
                    ),
                    headerTitle: () => (
                        <TouchableOpacity
                            style={styles.headerCenter}
                            activeOpacity={0.7}
                        >
                            <Image
                                source={{
                                    uri: getAvatarUrl(id || "unknown"),
                                }}
                                style={styles.headerAvatar}
                            />
                            <View>
                                <Text
                                    style={[
                                        styles.headerName,
                                        { color: theme.text },
                                    ]}
                                    numberOfLines={1}
                                >
                                    Friend {id?.slice(0, 4)}
                                </Text>
                                <Text
                                    style={[
                                        styles.headerStatus,
                                        { color: theme.textSecondary },
                                    ]}
                                >
                                    ออนไลน์
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <View style={styles.headerRight}>
                            <TouchableOpacity style={styles.headerIconBtn}>
                                <Ionicons
                                    name="videocam-outline"
                                    size={23}
                                    color={theme.text}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerIconBtn}>
                                <Ionicons
                                    name="call-outline"
                                    size={21}
                                    color={theme.text}
                                />
                            </TouchableOpacity>
                        </View>
                    ),
                }}
            />

            {/* ─── Chat body — uses Animated.View for keyboard ── */}
            <Animated.View style={[styles.flex1, animatedBottomStyle]}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator
                            size="small"
                            color={theme.textSecondary}
                        />
                    </View>
                ) : (
                    <FlatList<ChatMessage>
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={keyExtractor}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.listContent}
                        keyboardDismissMode="interactive"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => {
                            flatListRef.current?.scrollToEnd({
                                animated: false,
                            });
                        }}
                    />
                )}

                {/* ─── Input Bar ──────────────────────────────── */}
                <View
                    style={[
                        styles.inputBar,
                        {
                            backgroundColor: theme.inputBarBg,
                            borderTopColor: theme.border,
                            paddingBottom: Math.max(insets.bottom, 40),
                        },
                    ]}
                >
                    {/* Attachment */}
                    <TouchableOpacity
                        style={styles.inputSideBtn}
                        activeOpacity={0.6}
                    >
                        <Ionicons
                            name="add-circle-outline"
                            size={26}
                            color={theme.textSecondary}
                        />
                    </TouchableOpacity>

                    {/* Text field */}
                    <View
                        style={[
                            styles.inputPill,
                            { backgroundColor: theme.inputBg },
                        ]}
                    >
                        <TextInput
                            ref={inputRef}
                            style={[styles.inputField, { color: theme.text }]}
                            placeholder="พิมพ์ข้อความ..."
                            placeholderTextColor={theme.textSecondary}
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />
                    </View>

                    {/* Send / Mic */}
                    {inputText.trim() ? (
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                { backgroundColor: theme.accent },
                            ]}
                            onPress={handleSend}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="send"
                                size={16}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.inputSideBtn}
                            activeOpacity={0.6}
                        >
                            <Ionicons
                                name="mic-outline"
                                size={25}
                                color={theme.textSecondary}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </Animated.View>
        </ThemedView>
    );
}

// ─── Styles ─────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex1: {
        flex: 1,
    },

    // Header
    headerBackBtn: {
        marginLeft: -4,
        padding: 4,
    },
    headerCenter: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    headerAvatar: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "#E8E8E8",
    },
    headerName: {
        fontFamily: FONT.bold,
        fontSize: 16,
        lineHeight: 20,
    },
    headerStatus: {
        fontFamily: FONT.regular,
        fontSize: 12,
        lineHeight: 16,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 2,
    },
    headerIconBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    // Message List
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 8,
    },

    // Bubble
    bubbleRow: {
        marginBottom: 6,
    },
    bubbleRowMe: {
        alignItems: "flex-end",
    },
    bubbleRowThem: {
        alignItems: "flex-start",
    },
    bubble: {
        maxWidth: "78%",
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: 8,
        borderRadius: 20,
    },
    bubbleText: {
        fontFamily: FONT.regular,
        fontSize: 15.5,
        lineHeight: 21,
    },
    bubbleFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 4,
    },
    timeText: {
        fontFamily: FONT.thin,
        fontSize: 11,
    },

    // Input Bar
    inputBar: {
        flexDirection: "row",
        alignItems: "flex-end",
        paddingHorizontal: 8,
        paddingTop: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        gap: 6,
    },
    inputSideBtn: {
        width: 38,
        height: 38,
        alignItems: "center",
        justifyContent: "center",
    },
    inputPill: {
        flex: 1,
        borderRadius: 24,
        paddingHorizontal: 16,
        minHeight: 40,
        justifyContent: "center",
    },
    inputField: {
        fontFamily: FONT.regular,
        fontSize: 15,
        paddingVertical: Platform.OS === "ios" ? 10 : 8,
        maxHeight: 100,
    },
    sendBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
    },
});
