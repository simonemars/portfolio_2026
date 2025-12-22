import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { theme, shadows } from '../../theme';

interface RegisterScreenProps {
  navigation: any;
}

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName || undefined);
    } catch (error) {
      Alert.alert('Registration Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Create Account
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign up to start reporting issues
        </Text>
        
        <TextInput
          label="Display Name (Optional)"
          value={displayName}
          onChangeText={setDisplayName}
          mode="outlined"
          style={styles.input}
          autoCapitalize="words"
          textColor={theme.colors.onSurface}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          theme={{ colors: { background: theme.colors.background } }}
        />
        
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          textColor={theme.colors.onSurface}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          theme={{ colors: { background: theme.colors.background } }}
        />
        
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          textColor={theme.colors.onSurface}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          theme={{ colors: { background: theme.colors.background } }}
        />
        
        <TextInput
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          mode="outlined"
          style={styles.input}
          secureTextEntry
          textColor={theme.colors.onSurface}
          outlineColor={theme.colors.outline}
          activeOutlineColor={theme.colors.primary}
          theme={{ colors: { background: theme.colors.background } }}
        />
        
        <Button
          mode="contained"
          onPress={handleRegister}
          style={styles.button}
          loading={loading}
          disabled={loading}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
        >
          Sign Up
        </Button>
        
        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
          textColor={theme.colors.onSurface}
        >
          Already have an account? Sign in
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  surface: {
    padding: 24,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...shadows.floating,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: theme.colors.placeholder,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.background,
  },
  button: {
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 6,
  },
  linkButton: {
    marginTop: 8,
  },
}); 