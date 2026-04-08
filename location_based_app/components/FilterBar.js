import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFilters } from "../context/FiltersContext";
import { useTheme } from "../theme/ThemeContext";

export default function FilterBar({ onOpen }) {
  const { filters } = useFilters();
  const { theme } = useTheme();

  const ageLabel =
    filters.age[0] === 18 && filters.age[1] === 99
      ? "Any age"
      : `${filters.age[0]}–${filters.age[1]}`;

  const chips = [
    { key: "radius", label: `${Math.round(filters.radiusKm)} km`, onPress: onOpen },
    { key: "age", label: ageLabel, onPress: onOpen }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, borderBottomColor: theme.colors.border }]}>
      {chips.map((chip) => (
        <Pressable
          key={chip.key}
          onPress={chip.onPress}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed && styles.chipPressed
          ]}
        >
          <Text style={[styles.chipText, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>{chip.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1
  },
  chip: {
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    maxWidth: 200
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }]
  },
  chipText: {
    fontSize: 14
  }
});
