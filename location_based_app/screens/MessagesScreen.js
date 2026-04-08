import React, { useState, useEffect, useCallback } from "react";
import { View, FlatList, StyleSheet, Pressable, Text, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import ScreenHeader from "../components/ScreenHeader";
import { useTheme } from "../theme/ThemeContext";
import { getThreads } from "../services/messages";
import Avatar from "../components/Avatar";

const POLL_INTERVAL = 5000;

export default function MessagesScreen({ navigation }) {
  const { theme } = useTheme();
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchThreads = useCallback(async () => {
    try {
      const data = await getThreads();
      setThreads(data ?? []);
    } catch (err) {
      console.error("Failed to load threads:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchThreads();
      const id = setInterval(fetchThreads, POLL_INTERVAL);
      return () => clearInterval(id);
    }, [fetchThreads])
  );

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={[styles.wrap, styles.centered, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title="Messages" />
      <FlatList
        data={threads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              navigation.navigate("Chat", {
                threadId: item.id,
                title: item.otherUser?.name ?? "Chat",
              })
            }
            style={[
              styles.threadItem,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Avatar name={item.otherUser?.name} size={50} />
            <View style={styles.threadContent}>
              <View style={styles.threadHeader}>
                <Text
                  style={[
                    styles.threadName,
                    {
                      fontFamily: theme.fonts.serifBold,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.otherUser?.name ?? "Conversation"}
                </Text>
                {item.lastAt && (
                  <Text
                    style={[
                      styles.threadTime,
                      {
                        fontFamily: theme.fonts.serif,
                        color: theme.colors.textSecondary,
                      },
                    ]}
                  >
                    {formatTime(item.lastAt)}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.threadPreview,
                  {
                    fontFamily: theme.fonts.serif,
                    color: theme.colors.textSecondary,
                  },
                ]}
                numberOfLines={1}
              >
                {item.lastText || "Start a conversation"}
              </Text>
            </View>
            {item.unreadCount > 0 && (
              <View
                style={[
                  styles.unreadBadge,
                  { backgroundColor: theme.colors.accent },
                ]}
              >
                <Text
                  style={[
                    styles.unreadText,
                    {
                      fontFamily: theme.fonts.serif,
                      color: theme.colors.bg,
                    },
                  ]}
                >
                  {item.unreadCount > 9 ? "9+" : item.unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
        )}
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
              No conversations yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  listContent: {
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  threadItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  threadContent: {
    flex: 1,
    marginLeft: 12,
  },
  threadHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  threadName: {
    fontSize: 17,
    flex: 1,
    marginRight: 8,
  },
  threadTime: {
    fontSize: 13,
  },
  threadPreview: {
    fontSize: 15,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
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
