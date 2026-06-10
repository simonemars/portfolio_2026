import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { supabase } from "../services/supabase";

const DESTRUCTIVE = "#E5484D";

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
  const [email, setEmail] = useState(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let active = true;
    // getSession() reads the locally cached session (no network round-trip),
    // which is plenty for showing the signed-in email.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && data?.session?.user?.email) setEmail(data.session.user.email);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setSigningOut(true);
    // App.js listens to onAuthStateChange and routes back to AuthScreen.
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error);
      Alert.alert("Couldn't log out", error.message);
      setSigningOut(false);
    }
  };

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

      <View style={[styles.card, styles.accountCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Account</Text>
        {email ? (
          <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.rowContent}>
              <View style={styles.rowLeft}>
                <Text style={[styles.rowDesc, { color: theme.colors.textSecondary }]}>Signed in as</Text>
                <Text style={[styles.rowLabel, { color: theme.colors.textPrimary, fontFamily: "CrimsonPro_600SemiBold" }]}>
                  {email}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={handleLogout}
          disabled={signingOut}
          style={({ pressed }) => [
            styles.row,
            styles.logoutRow,
            { opacity: signingOut ? 0.5 : pressed ? 0.7 : 1 }
          ]}
        >
          <View style={[styles.rowContent, styles.logoutContent]}>
            <Ionicons name="log-out-outline" size={20} color={DESTRUCTIVE} style={styles.logoutIcon} />
            <Text style={[styles.logoutLabel, { color: DESTRUCTIVE }]}>
              {signingOut ? "Logging out..." : "Log out"}
            </Text>
          </View>
        </Pressable>
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
  accountCard: {
    marginTop: 24
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
  },
  logoutRow: {
    borderBottomWidth: 0
  },
  logoutContent: {
    justifyContent: "flex-start"
  },
  logoutIcon: {
    marginRight: 8
  },
  logoutLabel: {
    fontFamily: "CrimsonPro_700Bold",
    fontSize: 16
  }
});
