import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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
    useAnimatedScrollHandler,
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
import { useFriends } from "@/hooks/use-friends";
import { ChatMessage } from "@/types/chat";

type ListItem =
    | { type: "date"; id: string; dateText: string }
    | { type: "message"; id: string; message: ChatMessage };

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

    const { messages, sendMessage, retryMessage, loading } = useChat(id, DEFAULT_DEVICE_ID);
    const { data: friends } = useFriends();
    const friend = friends?.find((f) => f.user_id === id);

    const [inputText, setInputText] = useState("");
    const flatListRef = useRef<FlatList<ListItem>>(null);
    const inputRef = useRef<TextInput>(null);

    const { flattenedData, stickyHeaderIndices } = useMemo(() => {
        const flat: ListItem[] = [];
        const stickyIndices: number[] = [];

        const isSameDay = (d1: Date, d2: Date) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        const formatDate = (timestamp?: number) => {
            if (!timestamp) return "ไม่ทราบเวลา";
            const date = new Date(timestamp);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (isSameDay(date, today)) return "วันนี้";
            if (isSameDay(date, yesterday)) return "เมื่อวาน";

            const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear() + 543}`;
        };

        messages.forEach((msg, index) => {
            const currentDate = new Date(msg.timestamp || 0);
            const currentDateString = currentDate.toDateString();

            const prevMsg = index > 0 ? messages[index - 1] : null;
            const prevDateString = prevMsg ? new Date(prevMsg.timestamp || 0).toDateString() : null;

            if (currentDateString !== prevDateString) {
                stickyIndices.push(flat.length);
                flat.push({
                    type: "date",
                    id: `date-${currentDateString}`,
                    dateText: formatDate(msg.timestamp)
                });
            }

            flat.push({
                type: "message",
                id: msg.id,
                message: msg
            });
        });

        return { flattenedData: flat, stickyHeaderIndices: stickyIndices };
    }, [messages]);

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

    // ─── Scrolling State for Sticky Date ───────────────────
    const isScrolling = useSharedValue(false);
    let scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null).current;

    const onScroll = useCallback(() => {
        if (!isScrolling.value) {
            isScrolling.value = true;
        }
        if (scrollTimeout) clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            isScrolling.value = false;
        }, 1500); // ชะลอเวลาให้แสดงนานขึ้นนิดนึง
    }, [isScrolling]);

    const dateSeparatorStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(isScrolling.value ? 1 : 0, { duration: 300 }),
            transform: [
                { translateY: withTiming(isScrolling.value ? 0 : -10, { duration: 300 }) }
            ]
        };
    });

    // ─── Render message ─────────────────────────────────────
    const renderMessage = useCallback(
        ({ item }: ListRenderItemInfo<ListItem>) => {
            if (item.type === "date") {
                return (
                    <Animated.View style={[styles.dateSeparatorContainer, dateSeparatorStyle]}>
                        <View style={[styles.dateSeparator, { backgroundColor: !isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.2)" }]}>
                            <Text style={[styles.dateSeparatorText, { color: !isDark ? "#fff" : "#000" }]}>
                                {item.dateText}
                            </Text>
                        </View>
                    </Animated.View>
                );
            }

            const msg = item.message;
            const isMe = msg.sender === "me";

            return (
                <View
                    style={[
                        styles.bubbleRow,
                        isMe ? styles.bubbleRowMe : styles.bubbleRowThem,
                    ]}
                >
                    <View style={isMe ? styles.messageContainerMe : styles.messageContainerThem}>
                        {/* They details (Avatar, name could go here) */}

                        <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', flex: 1 }}>

                            {/* Message Bubble */}
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
                                    {msg.text}
                                </Text>
                            </View>

                            {/* Meta info (Time & Status) outside bubble */}
                            <View style={[styles.metaContainer, isMe ? { marginRight: 6 } : { marginLeft: 6 }]}>
                                {isMe && msg.status === "failed" ? (
                                    <TouchableOpacity onPress={() => retryMessage(msg.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ alignItems: 'flex-end' }}>
                                        <Ionicons
                                            name="refresh-circle"
                                            size={20}
                                            color="#FF3B30"
                                        />
                                        <Text style={{ color: '#FF3B30', fontSize: 10, fontFamily: FONT.regular, marginTop: 2 }}>Failed</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'center' }}>
                                        <Text style={{ color: theme.textSecondary, fontSize: 9, fontFamily: FONT.regular }}>{msg.time}</Text>

                                        {isMe && msg.status && (
                                            <Ionicons
                                                name={
                                                    msg.status === "pending" ||
                                                        msg.status === "sending"
                                                        ? "time-outline"
                                                        : msg.status === "read"
                                                            ? "checkmark-done-outline"
                                                            : "checkmark-outline"
                                                }
                                                size={14}
                                                color={
                                                    msg.status === "read"
                                                        ? "#4FC3F7"
                                                        : theme.textSecondary
                                                }
                                                style={{ marginRight: 4 }}
                                            />
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>
            );
        },
        [theme, retryMessage, dateSeparatorStyle]
    );

    const keyExtractor = useCallback((item: ListItem) => item.id, []);

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
                                    uri:
                                        friend?.profile_picture ||
                                        getAvatarUrl(friend?.username || id || "unknown"),
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
                                    {friend?.display_name || friend?.username || `User ${id?.slice(0, 4)}`}
                                </Text>
                                {/* <Text
                                    style={[
                                        styles.headerStatus,
                                        { color: theme.textSecondary },
                                    ]}
                                >
                                    Online
                                </Text> */}
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
                    <Animated.FlatList<ListItem>
                        ref={flatListRef}
                        data={flattenedData}
                        keyExtractor={keyExtractor}
                        stickyHeaderIndices={stickyHeaderIndices}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.listContent}
                        keyboardDismissMode="interactive"
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        onContentSizeChange={() => {
                            flatListRef.current?.scrollToEnd({
                                animated: false,
                            });
                        }}
                        overScrollMode="never"
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
        marginBottom: 8,
    },
    bubbleRowMe: {
        alignItems: "flex-end",
    },
    bubbleRowThem: {
        alignItems: "flex-start",
    },
    messageContainerMe: {
        flexDirection: 'row-reverse',
        maxWidth: "85%",
    },
    messageContainerThem: {
        flexDirection: 'row',
        maxWidth: "85%",
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
    },
    bubbleText: {
        fontFamily: FONT.regular,
        fontSize: 15,
        lineHeight: 22,
    },
    metaContainer: {
        justifyContent: 'flex-end',
        paddingBottom: 2,
    },

    // Date Separator
    dateSeparatorContainer: {
        alignItems: "center",
        marginVertical: 12,
        zIndex: 10,
    },
    dateSeparator: {
        paddingHorizontal: 10,
        borderRadius: 16,
    },
    dateSeparatorText: {
        fontFamily: FONT.regular,
        fontSize: 10,
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
