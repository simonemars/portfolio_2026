import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { getMessages, sendMessage } from "../services/messages";
import Avatar from "../components/Avatar";

const POLL_INTERVAL = 3000;

export default function ChatScreen() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef(null);
  const prevCountRef = useRef(0);

  useEffect(() => {
    navigation.setOptions({
      title: params?.title ?? "Chat",
      headerBackTitle: "Messages",
    });
  }, [navigation, params?.title]);

  const fetchMessages = useCallback(async () => {
    if (!params?.threadId) return;
    try {
      const data = await getMessages(params.threadId);
      const msgs = data ?? [];
      setMessages(msgs);
      if (msgs.length > prevCountRef.current) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
      prevCountRef.current = msgs.length;
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [params?.threadId]);

  useFocusEffect(
    useCallback(() => {
      fetchMessages();
      const id = setInterval(fetchMessages, POLL_INTERVAL);
      return () => clearInterval(id);
    }, [fetchMessages])
  );

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !params?.threadId) return;

    setText("");
    try {
      await sendMessage(params.threadId, trimmed);
      await fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item }) => {
          const mine = item.isOwn;
          return (
            <View
              style={[
                styles.messageContainer,
                { alignItems: mine ? "flex-end" : "flex-start" },
              ]}
            >
              {!mine && (
                <View style={styles.messageAvatar}>
                  <Avatar name={params?.title} size={32} />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: mine
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    {
                      fontFamily: theme.fonts.serif,
                      color: mine ? "#fff" : theme.colors.textPrimary,
                    },
                  ]}
                >
                  {item.text}
                </Text>
                <Text
                  style={[
                    styles.messageTime,
                    {
                      fontFamily: theme.fonts.serif,
                      color: mine
                        ? "rgba(255,255,255,0.7)"
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {formatTime(item.createdAt)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text
              style={[
                styles.emptyText,
                {
                  fontFamily: theme.fonts.serif,
                  color: theme.colors.textSecondary,
                },
              ]}
            >
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surfaceAlt,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.textPrimary,
              borderColor: theme.colors.border,
            },
          ]}
          placeholder="Message…"
          placeholderTextColor={theme.colors.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={send}
          style={[
            styles.sendButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: text.trim() ? 1 : 0.5,
            },
          ]}
          disabled={!text.trim()}
        >
          <Text
            style={[
              styles.sendText,
              {
                fontFamily: theme.fonts.serif,
                color: "#fff",
              },
            ]}
          >
            Send
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: { justifyContent: "center", alignItems: "center" },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    alignSelf: "flex-end",
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    borderWidth: 1,
    fontFamily: "CrimsonPro_600SemiBold",
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 40,
    justifyContent: "center",
  },
  sendText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
  },
});
