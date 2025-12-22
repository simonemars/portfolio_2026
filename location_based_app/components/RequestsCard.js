import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function RequestsCard({ count, onReview }) {
  const { theme } = useTheme();
  if (count === 0) return null;

  return (
    <Pressable onPress={onReview} style={styles.container}>
      <LinearGradient
        colors={[theme.colors.accent + "15", theme.colors.accent + "08"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderColor: theme.colors.accent + "40" }]}
      >
        <View style={styles.card}>
          <View style={[styles.iconContainer, { backgroundColor: theme.colors.accent + "25", borderColor: theme.colors.accent + "50" }]}>
            <Ionicons name="person-add" size={28} color={theme.colors.accent} />
          </View>
          <View style={styles.content}>
            <Text style={[styles.count, { fontFamily: theme.fonts.serifBold, color: theme.colors.accent }]}>{count}</Text>
            <Text style={[styles.label, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
              friend request{count !== 1 ? "s" : ""} pending
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            <Pressable onPress={onReview} style={[styles.button, { backgroundColor: theme.colors.accent }]}>
              <Text style={[styles.buttonText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>Review</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.bg} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden"
  },
  gradient: {
    borderRadius: 16,
    borderWidth: 2
  },
  card: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2
  },
  content: {
    flex: 1
  },
  count: {
    fontSize: 32,
    lineHeight: 36,
    marginBottom: 2
  },
  label: {
    fontSize: 14,
    lineHeight: 20
  },
  buttonContainer: {
    alignItems: "flex-end"
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 100,
    justifyContent: "center"
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600"
  }
});

