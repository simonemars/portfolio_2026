import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export default function StepName({ value, onChange }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
        What's your name?
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Your display name"
        placeholderTextColor={theme.colors.textSecondary}
        autoFocus
        maxLength={120}
        returnKeyType="done"
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
            fontFamily: theme.fonts.sans,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 28, lineHeight: 34, marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
  },
});
