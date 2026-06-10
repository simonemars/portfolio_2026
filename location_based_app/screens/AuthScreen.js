import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import { supabase } from "../services/supabase";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const handleAuth = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    setError("");
    setNotice("");

    if (!trimmedEmail || !trimmedPassword) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (signUpError) throw signUpError;

        // If Supabase returned a session, sign-up is complete and App.js will
        // route us in automatically. If there's no session, email confirmation
        // is required before the account can sign in.
        if (!data?.session) {
          setNotice("Check your email to confirm your account, then sign in.");
          setIsSignUp(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });
        if (signInError) throw signInError;
      }
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp((v) => !v);
    setError("");
    setNotice("");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.bg, paddingTop: insets.top + 40 }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <Text style={[styles.title, { fontFamily: theme.fonts.serifBold, color: theme.colors.textPrimary }]}>
          Phega
        </Text>
        <Text style={[styles.subtitle, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
          {isSignUp ? "Create your account" : "Welcome back"}
        </Text>

        <View style={styles.form}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border,
                fontFamily: theme.fonts.serif,
              },
            ]}
            placeholder="Email"
            placeholderTextColor={theme.colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            editable={!loading}
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                color: theme.colors.textPrimary,
                borderColor: theme.colors.border,
                fontFamily: theme.fonts.serif,
              },
            ]}
            placeholder="Password"
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            editable={!loading}
          />

          {error ? (
            <Text style={[styles.error, { fontFamily: theme.fonts.serif }]}>{error}</Text>
          ) : null}
          {notice ? (
            <Text style={[styles.notice, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
              {notice}
            </Text>
          ) : null}

          <Pressable
            onPress={handleAuth}
            disabled={loading}
            style={[styles.button, { backgroundColor: theme.colors.primary, opacity: loading ? 0.6 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { fontFamily: theme.fonts.serifBold }]}>
                {isSignUp ? "Sign Up" : "Log In"}
              </Text>
            )}
          </Pressable>
        </View>

        <Pressable onPress={switchMode} disabled={loading} style={styles.toggle}>
          <Text style={[styles.toggleText, { fontFamily: theme.fonts.serif, color: theme.colors.textSecondary }]}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <Text style={{ color: theme.colors.primary }}>
              {isSignUp ? "Log In" : "Sign Up"}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 36,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 40,
  },
  form: {
    gap: 14,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 16,
  },
  error: {
    color: "#E5484D",
    fontSize: 15,
    textAlign: "center",
  },
  notice: {
    fontSize: 15,
    textAlign: "center",
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
  toggle: {
    marginTop: 24,
    alignItems: "center",
  },
  toggleText: {
    fontSize: 15,
  },
});
