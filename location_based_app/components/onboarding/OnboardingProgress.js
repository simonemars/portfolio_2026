import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

// A row of `total` segments with the first `step` filled in the accent colour.
export default function OnboardingProgress({ step, total }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.seg,
            { backgroundColor: i < step ? theme.colors.accent : theme.colors.chip },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, flex: 1 },
  seg: { flex: 1, height: 5, borderRadius: 3 },
});
