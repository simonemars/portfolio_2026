import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";

export default function PersonCard({
  name,
  bio,
  onAdd,
  isFriend = false,
  inRange = false,
  distanceKm = null,
  showDistance = false
}) {
  const { theme } = useTheme();
  
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderRadius: theme.radii.xl, borderColor: theme.colors.border }]}>
      <View style={{ flex: 1 }}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>{name}</Text>
          {showDistance && distanceKm !== null && !inRange && (
            <View style={[styles.badge, { backgroundColor: theme.colors.bg2, borderColor: theme.colors.border }]}>
              <Text style={[styles.badgeText, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
                {distanceKm.toFixed(1)} km
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.bio, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>{bio}</Text>
      </View>
      {!isFriend && onAdd && (
        <Pressable onPress={onAdd} style={[styles.addBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.bg2 }]} hitSlop={8}>
          <Ionicons name="person-add-outline" size={20} color={theme.colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6
  },
  name: {
    fontSize: 22,
    flex: 1
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1
  },
  badgeText: {
    fontSize: 12
  },
  bio: {
    fontSize: 14,
    marginTop: 0
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12
  }
});

