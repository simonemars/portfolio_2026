import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

function AppearanceRow({ label, desc, selected, onPress }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          opacity: pressed ? 0.7 : 1
        }
      ]}
    >
      <View style={styles.rowContent}>
        <View style={styles.rowLeft}>
          <Text
            style={[
              styles.rowLabel,
              {
                color: theme.colors.textPrimary,
                fontFamily: selected ? "CrimsonPro_700Bold" : "CrimsonPro_600SemiBold"
              }
            ]}
          >
            {label}
          </Text>
          {desc ? (
            <Text style={[styles.rowDesc, { color: theme.colors.textSecondary }]}>{desc}</Text>
          ) : null}
        </View>
        {selected && (
          <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
        )}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { mode, setMode } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Appearance</Text>
        <AppearanceRow
          label="System"
          desc="Follow device setting"
          selected={mode === "system"}
          onPress={() => setMode("system")}
        />
        <AppearanceRow
          label="Dark"
          selected={mode === "dark"}
          onPress={() => setMode("dark")}
        />
        <AppearanceRow
          label="Light (Blue)"
          desc="Very light blue background"
          selected={mode === "lightBlue"}
          onPress={() => setMode("lightBlue")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden"
  },
  sectionTitle: {
    fontFamily: "CrimsonPro_700Bold",
    fontSize: 18,
    padding: 16,
    paddingBottom: 12
  },
  row: {
    borderBottomWidth: 1,
    paddingHorizontal: 16
  },
  rowContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16
  },
  rowLeft: {
    flex: 1
  },
  rowLabel: {
    fontSize: 16,
    marginBottom: 4
  },
  rowDesc: {
    fontFamily: "CrimsonPro_600SemiBold",
    fontSize: 14,
    marginTop: 4
  }
});



