import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useUser } from "../context/UserContext";
import { updateMe } from "../services/profile";
import { pickAvatar } from "../services/avatar";
import Avatar from "./Avatar";

export default function EditProfileSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { me, refreshMe } = useUser();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  // hydrate local state from current profile whenever the sheet opens
  useEffect(() => {
    if (visible) {
      setName(me?.name ?? "");
      setBio(me?.bio ?? "");
      setAge(me?.age != null ? String(me.age) : "");
      setAvatarUrl(me?.avatarUrl ?? null);
    }
  }, [visible, me]);

  const handlePickPhoto = async () => {
    const dataUri = await pickAvatar();
    if (dataUri) setAvatarUrl(dataUri);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const trimmedAge = age.trim();
      const parsedAge = trimmedAge === "" ? null : Number(trimmedAge);
      await updateMe({
        name: name.trim(),
        age: Number.isNaN(parsedAge) ? null : parsedAge,
        bio: bio.trim(),
        avatarUrl
      });
      await refreshMe();
      onClose();
    } catch (error) {
      console.error("Failed to update profile:", error);
      // keep the sheet open so the user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.bg2 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
                Edit profile
              </Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Photo */}
              <View style={styles.avatarRow}>
                <Avatar name={name} imageUrl={avatarUrl} size={84} />
                <Pressable onPress={handlePickPhoto} hitSlop={8} style={styles.changePhotoBtn}>
                  <Text style={[styles.changePhoto, { fontFamily: theme.fonts.sansMed, color: theme.colors.accent }]}>
                    {avatarUrl ? "Change photo" : "Add photo"}
                  </Text>
                </Pressable>
              </View>

              {/* Name */}
              <View style={styles.field}>
                <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.colors.textSecondary}
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary, fontFamily: theme.fonts.sans }
                  ]}
                />
              </View>

              {/* Age */}
              <View style={styles.field}>
                <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Age</Text>
                <TextInput
                  value={age}
                  onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ""))}
                  placeholder="Your age"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary, fontFamily: theme.fonts.sans }
                  ]}
                />
              </View>

              {/* Bio */}
              <View style={styles.field}>
                <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Bio</Text>
                <TextInput
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell people about yourself"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  style={[
                    styles.input,
                    styles.multiline,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary, fontFamily: theme.fonts.sans }
                  ]}
                />
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={[styles.saveButton, { backgroundColor: theme.colors.accent, opacity: saving ? 0.7 : 1 }]}
              >
                {saving ? (
                  <ActivityIndicator color={theme.colors.bg} />
                ) : (
                  <Text style={[styles.saveText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end"
  },
  kav: {
    justifyContent: "flex-end"
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1
  },
  headerTitle: {
    fontSize: 24
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    paddingHorizontal: 20
  },
  avatarRow: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4
  },
  changePhotoBtn: {
    marginTop: 12
  },
  changePhoto: {
    fontSize: 15
  },
  field: {
    paddingVertical: 12
  },
  label: {
    fontSize: 18,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: "top"
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    fontSize: 16,
    fontWeight: "600"
  }
});
