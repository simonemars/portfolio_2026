import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import ScreenHeader from "../components/ScreenHeader";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title="Profile" />
      <View style={{ height: 12 }} />

      {/* Profile Info Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={[styles.avatarText, { color: theme.colors.surface }]}>JD</Text>
          </View>
        </View>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>John Doe</Text>
        <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
          Designer & Developer
        </Text>
      </View>

      <View style={{ height: 16 }} />

      {/* Settings Entry */}
      <Pressable
        onPress={() => navigation.navigate("Settings")}
        style={({ pressed }) => [
          styles.settingsCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.7 : 1
          }
        ]}
      >
        <View style={styles.settingsContent}>
          <View style={styles.settingsLeft}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.settingsTitle, { color: theme.colors.textPrimary }]}>Settings</Text>
              <Text style={[styles.settingsDesc, { color: theme.colors.textSecondary }]}>
                Appearance, privacy, notifications
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  section: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center"
  },
  avatarContainer: {
    marginBottom: 12
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontFamily: "CrimsonPro_700Bold",
    fontSize: 32
  },
  name: {
    fontFamily: "CrimsonPro_700Bold",
    fontSize: 24,
    marginBottom: 4
  },
  bio: {
    fontFamily: "CrimsonPro_600SemiBold",
    fontSize: 16
  },
  settingsCard: {
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1
  },
  settingsContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  settingsLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1
  },
  settingsTitle: {
    fontFamily: "CrimsonPro_700Bold",
    fontSize: 18,
    marginBottom: 4
  },
  settingsDesc: {
    fontFamily: "CrimsonPro_600SemiBold",
    fontSize: 14
  }
});



