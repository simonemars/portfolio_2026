import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function LocationPermissionBanner({ onEnable }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.content}>
        <Ionicons name="location-outline" size={24} color={theme.colors.accent} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Enable location to use Nearby</Text>
          <Text style={[styles.subtitle, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
            Share your approximate location to discover people nearby
          </Text>
        </View>
      </View>
      <Pressable onPress={onEnable} style={[styles.button, { backgroundColor: theme.colors.accent }]}>
        <Text style={[styles.buttonText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>Enable</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    borderWidth: 1
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12
  },
  textContainer: {
    flex: 1,
    marginLeft: 12
  },
  title: {
    fontSize: 18,
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600"
  }
});

