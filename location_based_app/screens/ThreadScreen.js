import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function ThreadScreen({ route }) {
  const { theme } = useTheme();
  const { name } = route.params || {};
  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.bg }]}>
      <Text style={[styles.system, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
        New thread with <Text style={{ color: theme.colors.textPrimary }}>{name}</Text>
      </Text>
      {/* TODO: implement message bubbles + composer */}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20 },
  system: {
    fontSize: 14
  }
});

