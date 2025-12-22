import React from "react";
import { View, Text, StyleSheet, Pressable, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function LocationToggle({ 
  permission, 
  inRangeSharing, 
  onToggle, 
  onEnable 
}) {
  const { theme } = useTheme();
  
  if (permission === "unknown" || permission === "denied") {
    return (
      <Pressable onPress={onEnable} style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.content}>
          <Ionicons name="location-outline" size={20} color={theme.colors.accent} />
          <View style={styles.textContainer}>
            <Text style={[styles.title, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>Enable Location</Text>
            <Text style={[styles.subtitle, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>Share your approximate location to discover people nearby</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.content}>
        <Ionicons 
          name={inRangeSharing ? "location" : "location-outline"} 
          size={20} 
          color={inRangeSharing ? theme.colors.accent : theme.colors.textSecondary} 
        />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>
            {inRangeSharing ? "In-Range Sharing" : "Location Hidden"}
          </Text>
        </View>
      </View>
      <Switch
        value={inRangeSharing}
        onValueChange={onToggle}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.accent + "80"
        }}
        thumbColor={inRangeSharing ? theme.colors.accent : theme.colors.textSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  textContainer: {
    flex: 1,
    marginLeft: 12
  },
  title: {
    fontSize: 15
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18
  }
});

