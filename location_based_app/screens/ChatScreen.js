import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  FlatList,
  Text,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { getMessageService } from "../services/messages";
import Avatar from "../components/Avatar";

const CURRENT_USER = "demo-user"; // TODO: wire to auth
const messageService = getMessageService();

export default function ChatScreen() {
  const { params } = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const flatListRef = useRef(null);

  // Fix back label to show "Messages"
  useEffect(() => {
    navigation.setOptions({
      title: params?.title ?? "Chat",
      headerBackTitle: "Messages", // iOS back button label
    });
  }, [navigation, params?.title]);

  // Watch messages for this thread
  useEffect(() => {
    if (!params?.threadId) return;
    
    const unsubscribe = messageService.watchMessages(params.threadId, (newMessages) => {
      setMessages(newMessages);
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    
    return unsubscribe;
  }, [params?.threadId]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || !params?.threadId) return;

    setText("");
    
    await messageService.sendMessage(params.threadId, {
      senderId: CURRENT_USER,
      threadId: params.threadId,
      text: trimmed,
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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
          const mine = item.senderId === CURRENT_USER;
          return (
            <View
              style={[
                styles.messageContainer,
                { alignItems: mine ? "flex-end" : "flex-start" },
              ]}
            >
              {!mine && (
                <View style={styles.messageAvatar}>
                  <Avatar
                    name={params?.title}
                    size={32}
                  />
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

