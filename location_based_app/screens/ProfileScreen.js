import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useUser } from "../context/UserContext";
import ScreenHeader from "../components/ScreenHeader";
import Avatar from "../components/Avatar";
import EditProfileSheet from "../components/EditProfileSheet";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { me, loadingMe } = useUser();
  const [editVisible, setEditVisible] = useState(false);

  const showLoading = loadingMe && !me;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <ScreenHeader title="Profile" />
      <View style={{ height: 12 }} />

      {/* Profile Info Section */}
      <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {showLoading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : (
          <>
            <View style={styles.avatarContainer}>
              <Avatar name={me?.name} imageUrl={me?.avatarUrl} size={80} />
            </View>
            <Text style={[styles.name, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
              {me?.name || "Unnamed"}
            </Text>
            {me?.bio ? (
              <Text style={[styles.bio, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
                {me.bio}
              </Text>
            ) : (
              <Text style={[styles.bio, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary, fontStyle: "italic" }]}>
                Add a bio
              </Text>
            )}
            {me?.age != null && (
              <Text style={[styles.age, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>
                Age {me.age}
              </Text>
            )}

            <Pressable
              onPress={() => setEditVisible(true)}
              style={({ pressed }) => [
                styles.editButton,
                { backgroundColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Ionicons name="create-outline" size={18} color={theme.colors.bg} />
              <Text style={[styles.editButtonText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>
                Edit profile
              </Text>
            </Pressable>
          </>
        )}
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
              <Text style={[styles.settingsTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Settings</Text>
              <Text style={[styles.settingsDesc, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
                Appearance, privacy, notifications
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </View>
      </Pressable>

      <EditProfileSheet visible={editVisible} onClose={() => setEditVisible(false)} />
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
  name: {
    fontSize: 24,
    marginBottom: 4
  },
  bio: {
    fontSize: 16,
    textAlign: "center"
  },
  age: {
    fontSize: 14,
    marginTop: 6
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 12
  },
  editButtonText: {
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
    fontSize: 18,
    marginBottom: 4
  },
  settingsDesc: {
    fontSize: 14
  }
});
