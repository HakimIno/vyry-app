import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { useState, useRef, useEffect } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    View,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getAvatarUrl } from "@/components/ui/avatar-picker-sheet";
import { WHATSAPP_GREEN, DEFAULT_DEVICE_ID } from "@/constants/chat";
import { useChat, ChatMessage } from "@/hooks/use-chat";

export default function ChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const _router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === "dark";

    // Use the real chat hook
    const { messages, sendMessage, loading } = useChat(id, DEFAULT_DEVICE_ID);

    const [inputText, setInputText] = useState("");
    // biome-ignore lint/suspicious/noExplicitAny: FlashList type definition is treated as a value
    const flatListRef = useRef<any>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendMessage(inputText.trim());
        setInputText("");
    };

    const bgColor = isDark ? "#000000" : "#F2F2F7"; // WhatsApp-like background
    const headerBg = isDark ? "#1C1C1E" : "#FFFFFF";
    const textColor = isDark ? "#FFFFFF" : "#000000";
    const bubbleMe = WHATSAPP_GREEN;
    const bubbleThem = isDark ? "#2C2C2E" : "#FFFFFF";
    const textMe = "#FFFFFF";
    const textThem = textColor;

    return (
        <ThemedView style={[styles.container, { backgroundColor: bgColor }]}>
            <Stack.Screen
                options={{
                    title: "", // Custom header
                    headerShadowVisible: false,
                    headerStyle: { backgroundColor: headerBg },
                    headerTintColor: textColor,
                    headerTitle: () => (
                        <View style={styles.headerTitleContainer}>
                            <Image
                                source={{ uri: getAvatarUrl(id || "unknown") }}
                                style={styles.headerAvatar}
                            />
                            <View>
                                <ThemedText style={styles.headerName}>Friend {id?.slice(0, 4)}</ThemedText>
                                <ThemedText style={styles.headerStatus}>Online (Signal E2EE)</ThemedText>
                            </View>
                        </View>
                    ),
                    headerRight: () => (
                        <TouchableOpacity style={{ marginRight: 8 }}>
                            <Ionicons name="call-outline" size={24} color={textColor} />
                        </TouchableOpacity>
                    )
                }}
            />

            {loading ? (
                <View style={[styles.centerContainer, { backgroundColor: bgColor }]}>
                    <ActivityIndicator size="large" color={textColor} />
                </View>
            ) : (
                <FlashList<ChatMessage>
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.messageList}
                    renderItem={({ item }) => (
                        <View
                            style={[
                                styles.messageBubble,
                                item.sender === "me"
                                    ? [styles.messageBubbleMe, { backgroundColor: bubbleMe }]
                                    : [styles.messageBubbleThem, { backgroundColor: bubbleThem }],
                            ]}
                        >
                            <ThemedText
                                style={{
                                    color: item.sender === "me" ? textMe : textThem,
                                    fontSize: 16,
                                }}
                            >
                                {item.text}
                            </ThemedText>
                            <ThemedText style={[styles.messageTime, { color: item.sender === "me" ? "rgba(255,255,255,0.7)" : "#8E8E93" }]}>
                                {item.time}
                            </ThemedText>
                        </View>
                    )}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
            >
                <SafeAreaView edges={['bottom']}>
                    <View style={[styles.inputContainer, { backgroundColor: headerBg }]}>
                        <TouchableOpacity style={styles.attachButton}>
                            <Ionicons name="add" size={28} color="#007AFF" />
                        </TouchableOpacity>

                        <TextInput
                            style={[
                                styles.input,
                                {
                                    backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                                    color: textColor
                                }
                            ]}
                            placeholder="Message"
                            placeholderTextColor="#8E8E93"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                        />

                        <TouchableOpacity
                            style={[styles.sendButton, { backgroundColor: inputText.trim() ? "#007AFF" : "transparent" }]}
                            onPress={handleSend}
                            disabled={!inputText.trim()}
                        >
                            {inputText.trim() ? (
                                <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
                            ) : (
                                <Ionicons name="mic-outline" size={24} color="#007AFF" />
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerTitleContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: "#E1E1E1"
    },
    headerName: {
        fontSize: 16,
        fontWeight: "600",
    },
    headerStatus: {
        fontSize: 12,
        color: "#8E8E93",
    },
    messageList: {
        padding: 16,
        paddingBottom: 32,
        gap: 12,
    },
    messageBubble: {
        maxWidth: "80%",
        padding: 12,
        borderRadius: 16,
    },
    messageBubbleMe: {
        alignSelf: "flex-end",
        borderBottomRightRadius: 4,
    },
    messageBubbleThem: {
        alignSelf: "flex-start",
        borderBottomLeftRadius: 4,
    },
    messageTime: {
        fontSize: 11,
        marginTop: 4,
        alignSelf: "flex-end",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 8,
        paddingVertical: 8,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: "rgba(128,128,128,0.2)",
    },
    attachButton: {
        padding: 8,
    },
    input: {
        flex: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 16,
        maxHeight: 100,
        marginHorizontal: 8,
    },
    sendButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
    },
    centerContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
});
