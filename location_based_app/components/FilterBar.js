import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useFilters } from "../context/FiltersContext";
import { useTheme } from "../theme/ThemeContext";

export default function FilterBar({ onOpen }) {
  const { filters, activeFilterCount } = useFilters();
  const { theme } = useTheme();

  const chips = [
    { label: `${Math.round(filters.radiusKm)} km`, onPress: onOpen },
    {
      label: `Interests${filters.interests.length > 0 ? ` (${filters.interests.length})` : ""}`,
      onPress: onOpen
    },
    {
      label: "Age",
      onPress: onOpen
    },
    {
      label: `Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`,
      onPress: onOpen
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg, borderBottomColor: theme.colors.border }]}>
      {chips.map((chip, index) => (
        <Pressable
          key={index}
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
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1
  },
  chip: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
    flex: 1,
    maxWidth: 120
  },
  chipPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }]
  },
  chipText: {
    fontSize: 14
  }
});

