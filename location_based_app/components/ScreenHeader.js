import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";

export default function ScreenHeader({ title, subtitle, right }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  
  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top + 8, 16) }]}>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>{title}</Text>
        {subtitle && (
          <View style={[styles.subtitleContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Text style={[styles.subtitle, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>{subtitle}</Text>
          </View>
        )}
      </View>
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    minHeight: 56
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  title: {
    fontSize: 28,
    letterSpacing: 0.4
  },
  subtitleContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1
  },
  subtitle: {
    fontSize: 12
  }
});

