import React from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeContext";

export default function PillTabs({ tabs, active, onChange }) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg2, borderColor: theme.colors.border }]}>
      {tabs.map((t, index) => {
        const isActive = active === t.key;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[
              styles.segment,
              isActive && { backgroundColor: theme.colors.surface, borderColor: theme.colors.accent, borderWidth: 1 }
            ]}
          >
            <Text style={[
              styles.text,
              { fontFamily: theme.fonts.serif, color: isActive ? theme.colors.textPrimary : theme.colors.textSecondary }
            ]}>
              {t.label}
              {t.count !== undefined && (
                <Text style={{ opacity: isActive ? 0.8 : 0.7 }}> {t.count}</Text>
              )}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginHorizontal: 20,
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    height: 40
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10
  },
  text: {
    fontSize: 15
  }
});

