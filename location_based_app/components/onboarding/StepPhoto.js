import React from "react";
import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../theme/ThemeContext";
import { pickAvatar } from "../../services/avatar";

const SIZE = 140;

export default function StepPhoto({ photo, onChange }) {
  const { theme } = useTheme();

  const pick = async () => {
    const dataUri = await pickAvatar();
    if (dataUri) onChange(dataUri);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
        Add a profile photo
      </Text>

      <Pressable
        onPress={pick}
        style={[styles.circle, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
      >
        {photo ? (
          <Image source={{ uri: photo }} style={styles.image} />
        ) : (
          <Ionicons name="camera-outline" size={44} color={theme.colors.textSecondary} />
        )}
      </Pressable>

      {photo ? (
        <Pressable onPress={pick} hitSlop={8}>
          <Text style={[styles.action, { fontFamily: theme.fonts.sansMed, color: theme.colors.accent }]}>
            Change photo
          </Text>
        </Pressable>
      ) : (
        <Text style={[styles.hint, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>
          Tap the circle to choose a photo
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center" },
  label: { fontSize: 28, lineHeight: 34, marginBottom: 32, alignSelf: "stretch" },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: { width: SIZE, height: SIZE },
  action: { fontSize: 15, marginTop: 18 },
  hint: { fontSize: 14, marginTop: 18 },
});
