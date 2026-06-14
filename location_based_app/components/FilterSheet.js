import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFilters } from "../context/FiltersContext";
import { useTheme } from "../theme/ThemeContext";

const MIN_RADIUS = 1;
const MAX_RADIUS = 4;
const AGE_FLOOR = 13;
const AGE_CEIL = 120;
const DEFAULTS = { radiusKm: 4, age: [18, 99] };

export default function FilterSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { filters, updateFilters, resetFilters } = useFilters();

  const [radius, setRadius] = useState(filters.radiusKm);
  const [minAge, setMinAge] = useState(String(filters.age[0]));
  const [maxAge, setMaxAge] = useState(String(filters.age[1]));

  useEffect(() => {
    if (visible) {
      setRadius(filters.radiusKm);
      setMinAge(String(filters.age[0]));
      setMaxAge(String(filters.age[1]));
    }
  }, [visible, filters]);

  const handleApply = () => {
    let lo = parseInt(minAge, 10);
    let hi = parseInt(maxAge, 10);
    if (Number.isNaN(lo)) lo = AGE_FLOOR;
    if (Number.isNaN(hi)) hi = AGE_CEIL;
    lo = Math.min(Math.max(lo, AGE_FLOOR), AGE_CEIL);
    hi = Math.min(Math.max(hi, AGE_FLOOR), AGE_CEIL);
    if (lo > hi) [lo, hi] = [hi, lo];
    updateFilters({ radiusKm: radius, age: [lo, hi] });
    onClose();
  };

  const handleReset = () => {
    setRadius(DEFAULTS.radiusKm);
    setMinAge(String(DEFAULTS.age[0]));
    setMaxAge(String(DEFAULTS.age[1]));
    resetFilters();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <Pressable style={[styles.sheet, { backgroundColor: theme.colors.bg2 }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.headerTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Filters</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Radius */}
              <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
                <View style={styles.sectionHead}>
                  <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Radius</Text>
                  <Text style={[styles.sectionValue, { fontFamily: theme.fonts.serif, color: theme.colors.accent }]}>
                    {radius} km
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={MIN_RADIUS}
                  maximumValue={MAX_RADIUS}
                  step={1}
                  value={radius}
                  onValueChange={setRadius}
                  minimumTrackTintColor={theme.colors.accent}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.accent}
                />
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>{MIN_RADIUS} km</Text>
                  <Text style={[styles.sliderLabel, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>{MAX_RADIUS} km</Text>
                </View>
              </View>

              {/* Age */}
              <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Age range</Text>
                <View style={styles.ageRow}>
                  <View style={styles.ageField}>
                    <Text style={[styles.ageLabel, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>Minimum</Text>
                    <TextInput
                      value={minAge}
                      onChangeText={(t) => setMinAge(t.replace(/[^0-9]/g, ""))}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="13"
                      placeholderTextColor={theme.colors.textSecondary}
                      style={[styles.ageInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary, fontFamily: theme.fonts.sans }]}
                    />
                  </View>
                  <Text style={[styles.ageDash, { color: theme.colors.textSecondary }]}>–</Text>
                  <View style={styles.ageField}>
                    <Text style={[styles.ageLabel, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>Maximum</Text>
                    <TextInput
                      value={maxAge}
                      onChangeText={(t) => setMaxAge(t.replace(/[^0-9]/g, ""))}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="120"
                      placeholderTextColor={theme.colors.textSecondary}
                      style={[styles.ageInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.textPrimary, fontFamily: theme.fonts.sans }]}
                    />
                  </View>
                </View>
                <Text style={[styles.ageHint, { fontFamily: theme.fonts.sans, color: theme.colors.textSecondary }]}>
                  Only people whose age falls in this range are shown.
                </Text>
              </View>
            </ScrollView>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.border }]}>
              <Pressable onPress={handleReset} style={[styles.resetButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.resetText, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>Reset</Text>
              </Pressable>
              <Pressable onPress={handleApply} style={[styles.applyButton, { backgroundColor: theme.colors.accent }]}>
                <Text style={[styles.applyText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>Apply</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end" },
  kav: { justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "90%" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 24 },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 20 },
  section: { paddingVertical: 20, borderBottomWidth: 1 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 },
  sectionTitle: { fontSize: 18, marginBottom: 12 },
  sectionValue: { fontSize: 18 },
  slider: { width: "100%", height: 40 },
  sliderLabels: { flexDirection: "row", justifyContent: "space-between" },
  sliderLabel: { fontSize: 12 },
  ageRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  ageField: { flex: 1 },
  ageLabel: { fontSize: 13, marginBottom: 8 },
  ageInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    textAlign: "center",
  },
  ageDash: { fontSize: 20, marginBottom: 12 },
  ageHint: { fontSize: 13, marginTop: 12 },
  footer: { flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1 },
  resetButton: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  resetText: { fontSize: 16 },
  applyButton: { flex: 1, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  applyText: { fontSize: 16, fontWeight: "600" },
});
