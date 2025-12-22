import React from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function MessageItem({ name, preview, time, unreadCount = 0, isUnread = false, onPress }) {
  const { theme } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          isUnread && { backgroundColor: theme.isDark ? "#1f3a5a" : theme.colors.badge, borderColor: theme.colors.accent + "30" },
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim
          }
        ]}
      >
        {/* Avatar */}
        <View style={[
          styles.avatar,
          { backgroundColor: theme.colors.bg2, borderColor: theme.colors.border },
          isUnread && { backgroundColor: theme.colors.accent + "20", borderColor: theme.colors.accent + "40" }
        ]}>
          <Text style={[styles.avatarText, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>{getInitials(name)}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Top row: Name + Time */}
          <View style={styles.topRow}>
            <Text style={[
              styles.name,
              { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary },
              isUnread && { fontFamily: theme.fonts.serifBold }
            ]} numberOfLines={1}>
              {name}
            </Text>
            {time && (
              <Text style={[styles.time, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>{time}</Text>
            )}
          </View>

          {/* Preview */}
          <Text style={[styles.preview, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]} numberOfLines={2}>
            {preview}
          </Text>
        </View>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.colors.accent }]}>
            <Text style={[styles.badgeText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 10
  },
  card: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1
  },
  avatarText: {
    fontSize: 16
  },
  content: {
    flex: 1,
    justifyContent: "center"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 4
  },
  name: {
    fontSize: 17,
    flex: 1,
    marginRight: 8
  },
  time: {
    fontSize: 13,
    textAlign: "right"
  },
  preview: {
    fontSize: 15,
    lineHeight: 22, // 1.47 line height
    marginTop: 2
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginLeft: 8
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600"
  }
});
