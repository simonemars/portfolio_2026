import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { TextInput, Button, Text, Surface } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { theme, shadows } from '../../theme';

interface LoginScreenProps {
  navigation: any;
}

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      Alert.alert('Login Failed', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.surface}>
        <Text variant="headlineMedium" style={styles.title}>
          Welcome Back
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Sign in to your account
        </Text>
        
        <Text variant="bodySmall" style={styles.testInfo}>
          Test accounts:{'\n'}
          User: user@test.com / password{'\n'}
          Admin: admin@test.com / password
        </Text>
        
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
        
        <Button
          mode="contained"
          onPress={handleLogin}
          style={styles.button}
          loading={loading}
          disabled={loading}
          buttonColor={theme.colors.primary}
          textColor={theme.colors.onPrimary}
        >
          Sign In
        </Button>
        
        <Button
          mode="text"
          onPress={() => navigation.navigate('Register')}
          style={styles.linkButton}
          textColor={theme.colors.onSurface}
        >
          Don't have an account? Sign up
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
  testInfo: {
    textAlign: 'center',
    marginBottom: 24,
    color: theme.colors.placeholder,
    backgroundColor: theme.colors.secondary,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.outline,
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