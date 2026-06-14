import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export default function StepAge({ value, onChange, error }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
        How old are you?
      </Text>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ""))}
        placeholder="Your age"
        placeholderTextColor={theme.colors.textSecondary}
        keyboardType="number-pad"
        maxLength={3}
        autoFocus
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.primary : theme.colors.border,
            color: theme.colors.textPrimary,
            fontFamily: theme.fonts.sans,
          },
        ]}
      />
      {error ? (
        <Text style={[styles.error, { fontFamily: theme.fonts.sans, color: theme.colors.primary }]}>
          {error}
        </Text>
      ) : null}
      <Text style={[styles.note, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>
        Your age is kept private and never shown publicly.
      </Text>
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
  error: { fontSize: 13, marginTop: 10 },
  note: { fontSize: 13, marginTop: 10 },
});
