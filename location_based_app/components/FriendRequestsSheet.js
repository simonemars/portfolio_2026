import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
} from "../services/friends";
import { useTheme } from "../theme/ThemeContext";

export default function FriendRequestsSheet({ visible, onClose, onChanged }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (visible) {
      loadRequests();
    }
  }, [visible]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getFriendRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load friend requests:", err);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (request, action) => {
    if (busyId) return;
    setBusyId(request.id);
    try {
      if (action === "accept") {
        await acceptFriendRequest(request.id);
      } else {
        await declineFriendRequest(request.id);
      }
      setRequests((prev) => prev.filter((r) => r.id !== request.id));
      onChanged?.();
    } catch (err) {
      console.error(`Failed to ${action} friend request:`, err);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.bg2 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View
            style={[
              styles.header,
              { paddingTop: insets.top + 16, borderBottomColor: theme.colors.border },
            ]}
          >
            <Text
              style={[
                styles.headerTitle,
                { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary },
              ]}
            >
              Friend Requests
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.accent} style={styles.loader} />
            ) : requests.length === 0 ? (
              <Text
                style={[
                  styles.empty,
                  { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary },
                ]}
              >
                No pending requests
              </Text>
            ) : (
              requests.map((request) => (
                <View
                  key={request.id}
                  style={[
                    styles.requestCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.requestInfo}>
                    <Text
                      style={[
                        styles.requestName,
                        { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary },
                      ]}
                    >
                      {request.name}
                    </Text>
                    {!!request.bio && (
                      <Text
                        style={[
                          styles.requestBio,
                          { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {request.bio}
                      </Text>
                    )}
                  </View>
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => handleResolve(request, "decline")}
                      disabled={busyId === request.id}
                      style={[
                        styles.declineButton,
                        { borderColor: theme.colors.border, backgroundColor: theme.colors.bg2 },
                      ]}
                    >
                      <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleResolve(request, "accept")}
                      disabled={busyId === request.id}
                      style={[styles.acceptButton, { backgroundColor: theme.colors.accent }]}
                    >
                      <Ionicons name="checkmark" size={20} color={theme.colors.bg} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          <View style={{ paddingBottom: insets.bottom + 8 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 16,
  },
  loader: {
    marginTop: 40,
  },
  empty: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 40,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
    marginRight: 12,
  },
  requestName: {
    fontSize: 20,
    marginBottom: 4,
  },
  requestBio: {
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
