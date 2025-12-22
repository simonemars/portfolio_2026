import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFilters } from "../context/FiltersContext";
import { useTheme } from "../theme/ThemeContext";

const RADIUS_PRESETS = [1, 3, 5, 10, 25];
const INTERESTS = [
  "Hiking",
  "Coffee",
  "Music",
  "Art",
  "Food",
  "Sports",
  "Books",
  "Travel",
  "Photography",
  "Gaming"
];
const AGE_PRESETS = [
  { label: "18–25", value: [18, 25] },
  { label: "21–30", value: [21, 30] },
  { label: "25–35", value: [25, 35] },
  { label: "30–45", value: [30, 45] }
];

export default function FilterSheet({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { filters, locationState, updateFilters, resetFilters, updateLocationState } = useFilters();
  const [localFilters, setLocalFilters] = useState(filters);
  const [localInRangeSharing, setLocalInRangeSharing] = useState(locationState.inRangeSharing);

  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
      setLocalInRangeSharing(locationState.inRangeSharing);
    }
  }, [visible, filters, locationState.inRangeSharing]);

  const handleApply = () => {
    updateFilters(localFilters);
    updateLocationState({ inRangeSharing: localInRangeSharing });
    onClose();
  };

  const handleReset = () => {
    const defaultFilters = { radiusKm: 5, interests: [], age: [18, 99] };
    setLocalFilters(defaultFilters);
    resetFilters();
  };

  const toggleInterest = (interest) => {
    setLocalFilters((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.colors.bg2 }]} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: theme.colors.border }]}>
            <Text style={[styles.headerTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Filters</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Radius */}
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Radius</Text>
              <View style={styles.presetRow}>
                {RADIUS_PRESETS.map((preset) => {
                  const isActive = localFilters.radiusKm === preset;
                  return (
                    <Pressable
                      key={preset}
                      onPress={() => setLocalFilters((prev) => ({ ...prev, radiusKm: preset }))}
                      style={[
                        styles.presetChip,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        isActive && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          { fontFamily: theme.fonts.serif, color: isActive ? theme.colors.bg : theme.colors.textPrimary }
                        ]}
                      >
                        {preset} km
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.sliderContainer}>
                <Text style={[styles.sliderValue, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>
                  {localFilters.radiusKm.toFixed(1)} km
                </Text>
                <Pressable
                  style={[styles.sliderTrack, { backgroundColor: theme.colors.border }]}
                  onPress={(e) => {
                    const { locationX, width } = e.nativeEvent;
                    const percentage = Math.max(0, Math.min(1, locationX / width));
                    const newValue = 0.5 + percentage * 49.5; // 0.5 to 50
                    setLocalFilters((prev) => ({ ...prev, radiusKm: Math.round(newValue * 2) / 2 }));
                  }}
                >
                  <View
                    style={[
                      styles.sliderFill,
                      { width: `${((localFilters.radiusKm - 0.5) / 49.5) * 100}%`, backgroundColor: theme.colors.accent }
                    ]}
                  />
                  <View
                    style={[
                      styles.sliderThumb,
                      { left: `${((localFilters.radiusKm - 0.5) / 49.5) * 100}%`, backgroundColor: theme.colors.accent, borderColor: theme.colors.bg }
                    ]}
                  />
                </Pressable>
                <View style={styles.sliderLabels}>
                  <Text style={[styles.sliderLabel, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>0.5</Text>
                  <Text style={[styles.sliderLabel, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>50</Text>
                </View>
              </View>
            </View>

            {/* In-Range Sharing */}
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.switchRow}>
                <View style={styles.switchContent}>
                  <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>In-Range Sharing</Text>
                  <Text style={[styles.switchCaption, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
                    Shares in-range only — never exact location.
                  </Text>
                </View>
                <Switch
                  value={localInRangeSharing}
                  onValueChange={setLocalInRangeSharing}
                  trackColor={{
                    false: theme.colors.border,
                    true: theme.colors.accent + "80"
                  }}
                  thumbColor={localInRangeSharing ? theme.colors.accent : theme.colors.textSecondary}
                  disabled={locationState.permission !== "granted"}
                />
              </View>
            </View>

            {/* Interests */}
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Interests</Text>
              <View style={styles.interestsGrid}>
                {INTERESTS.map((interest) => {
                  const isSelected = localFilters.interests.includes(interest);
                  return (
                    <Pressable
                      key={interest}
                      onPress={() => toggleInterest(interest)}
                      style={[
                        styles.interestChip,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        isSelected && { backgroundColor: theme.colors.accent + "30", borderColor: theme.colors.accent }
                      ]}
                    >
                      <Text
                        style={[
                          styles.interestText,
                          { fontFamily: theme.fonts.serif, color: isSelected ? theme.colors.accent : theme.colors.textPrimary }
                        ]}
                      >
                        {interest}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Age */}
            <View style={[styles.section, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.sectionTitle, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>Age</Text>
              <View style={styles.presetRow}>
                {AGE_PRESETS.map((preset, index) => {
                  const isActive = localFilters.age[0] === preset.value[0] && localFilters.age[1] === preset.value[1];
                  return (
                    <Pressable
                      key={index}
                      onPress={() => setLocalFilters((prev) => ({ ...prev, age: preset.value }))}
                      style={[
                        styles.presetChip,
                        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                        isActive && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent }
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetText,
                          { fontFamily: theme.fonts.serif, color: isActive ? theme.colors.bg : theme.colors.textPrimary }
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.ageContainer}>
                <View style={styles.ageSliderContainer}>
                  <Text style={[styles.ageLabel, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>Min: {localFilters.age[0]}</Text>
                  <Pressable
                    style={[styles.ageSliderTrack, { backgroundColor: theme.colors.border }]}
                    onPress={(e) => {
                      const { locationX, width } = e.nativeEvent;
                      const percentage = Math.max(0, Math.min(1, locationX / width));
                      const newMin = Math.max(18, Math.min(localFilters.age[1] - 1, Math.round(18 + percentage * 81)));
                      setLocalFilters((prev) => ({ ...prev, age: [newMin, prev.age[1]] }));
                    }}
                  >
                    <View
                      style={[
                        styles.ageSliderFill,
                        { width: `${((localFilters.age[0] - 18) / 81) * 100}%`, backgroundColor: theme.colors.accent }
                      ]}
                    />
                  </Pressable>
                </View>
                <View style={styles.ageSliderContainer}>
                  <Text style={[styles.ageLabel, { fontFamily: theme.fonts.serif, color: theme.colors.textPrimary }]}>Max: {localFilters.age[1]}</Text>
                  <Pressable
                    style={[styles.ageSliderTrack, { backgroundColor: theme.colors.border }]}
                    onPress={(e) => {
                      const { locationX, width } = e.nativeEvent;
                      const percentage = Math.max(0, Math.min(1, locationX / width));
                      const newMax = Math.max(localFilters.age[0] + 1, Math.min(99, Math.round(18 + percentage * 81)));
                      setLocalFilters((prev) => ({ ...prev, age: [prev.age[0], newMax] }));
                    }}
                  >
                    <View
                      style={[
                        styles.ageSliderFill,
                        { width: `${((localFilters.age[1] - 18) / 81) * 100}%`, backgroundColor: theme.colors.accent }
                      ]}
                    />
                  </Pressable>
                </View>
              </View>
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
    flex: 1,
    paddingHorizontal: 20
  },
  section: {
    paddingVertical: 20,
    borderBottomWidth: 1
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 12
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1
  },
  presetText: {
    fontSize: 14
  },
  sliderContainer: {
    marginTop: 8
  },
  sliderValue: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center"
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
    position: "relative"
  },
  sliderFill: {
    height: "100%",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    position: "absolute",
    top: -8,
    marginLeft: -10
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sliderLabel: {
    fontSize: 12
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  switchContent: {
    flex: 1,
    marginRight: 16
  },
  switchCaption: {
    fontSize: 13,
    marginTop: 4
  },
  interestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  interestChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1
  },
  interestText: {
    fontSize: 14
  },
  ageContainer: {
    marginTop: 12,
    gap: 16
  },
  ageSliderContainer: {
    gap: 8
  },
  ageLabel: {
    fontSize: 14
  },
  ageSliderTrack: {
    height: 4,
    borderRadius: 2,
    position: "relative"
  },
  ageSliderFill: {
    height: "100%",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  resetText: {
    fontSize: 16
  },
  applyButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  applyText: {
    fontSize: 16,
    fontWeight: "600"
  }
});

