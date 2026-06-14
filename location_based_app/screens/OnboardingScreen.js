import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/ThemeContext";
import { useUser } from "../context/UserContext";
import { updateMe } from "../services/profile";
import OnboardingProgress from "../components/onboarding/OnboardingProgress";
import StepName from "../components/onboarding/StepName";
import StepAge from "../components/onboarding/StepAge";
import StepBio from "../components/onboarding/StepBio";
import StepPhoto from "../components/onboarding/StepPhoto";

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { refreshMe } = useUser();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // --- validation -----------------------------------------------------------
  const ageNum = age.trim() === "" ? null : parseInt(age, 10);
  const ageOutOfRange = age.trim() !== "" && (ageNum < 13 || ageNum > 120);
  const ageError = ageOutOfRange ? "Please enter an age between 13 and 120." : null;

  const canContinue =
    (step === 1 && name.trim().length > 0) ||
    (step === 2 && ageNum != null && !ageOutOfRange) ||
    step === 3 ||
    (step === 4 && !!photo);

  // --- transition (subtle horizontal slide + fade) --------------------------
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const prevStep = useRef(step);

  useEffect(() => {
    const dir = step >= prevStep.current ? 1 : -1;
    prevStep.current = step;
    slide.setValue(dir * 24);
    fade.setValue(0);
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 240, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, [step]);

  // --- navigation -----------------------------------------------------------
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handlePrimary = async () => {
    if (!canContinue || submitting) return;
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    // Final step: collect everything and finish.
    const payload = {
      name: name.trim(),
      age: ageNum,
      bio: bio.trim(),
      photo,
    };
    console.log("Onboarding complete:", payload);

    setSubmitting(true);
    try {
      // Persist the fields the backend knows about; the photo is local-only
      // for now (no avatar field yet) and is included in the logged payload.
      await updateMe({ name: payload.name, age: payload.age, bio: payload.bio });
      await refreshMe();
    } catch (e) {
      console.error("Failed to save onboarding profile:", e);
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepName value={name} onChange={setName} />;
      case 2:
        return <StepAge value={age} onChange={setAge} error={ageError} />;
      case 3:
        return <StepBio value={bio} onChange={setBio} />;
      case 4:
        return <StepPhoto photo={photo} onChange={setPhoto} />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }]}>
      {/* Header: back arrow + progress */}
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          hitSlop={10}
          disabled={step === 1}
          style={styles.backBtn}
        >
          <Ionicons
            name="chevron-back"
            size={28}
            color={step === 1 ? "transparent" : theme.colors.textPrimary}
          />
        </Pressable>
        <OnboardingProgress step={step} total={TOTAL_STEPS} />
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateX: slide }] }}>
            {renderStep()}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable
            onPress={handlePrimary}
            disabled={!canContinue || submitting}
            style={[
              styles.primaryBtn,
              { backgroundColor: theme.colors.accent, opacity: !canContinue || submitting ? 0.5 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.bg} />
            ) : (
              <Text style={[styles.primaryText, { fontFamily: theme.fonts.serif, color: theme.colors.bg }]}>
                {step === TOTAL_STEPS ? "Join" : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  body: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 16 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
  primaryBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontSize: 17 },
});
