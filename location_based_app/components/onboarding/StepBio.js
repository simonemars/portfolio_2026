import React from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

const MAX_BIO = 150;

export default function StepBio({ value, onChange }) {
  const { theme } = useTheme();
  return (
    <View>
      <Text style={[styles.label, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
        Tell us a bit about yourself.
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="I love hiking, cooking, and bad films."
        placeholderTextColor={theme.colors.textSecondary}
        multiline
        maxLength={MAX_BIO}
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
      <Text style={[styles.counter, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>
        {value.length} / {MAX_BIO}
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
    minHeight: 120,
    textAlignVertical: "top",
  },
  counter: { fontSize: 13, marginTop: 10, textAlign: "right" },
});
