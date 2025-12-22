import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { List, Button, Text, Surface, Divider, Avatar } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';
import { theme, shadows } from '../theme';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const deleteAccountFunction = httpsCallable(functions, 'deleteAccountData');
              await deleteAccountFunction();
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView 
      style={styles.container}
      contentInsetAdjustmentBehavior="never"
    >
      <Surface style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <Avatar.Text 
            size={80} 
            label={user?.displayName?.[0] || user?.email?.[0] || 'U'} 
            style={{ backgroundColor: theme.colors.primaryContainer }}
            color={theme.colors.onPrimaryContainer}
          />
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>{user?.displayName || 'User'}</Text>
            <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
            <Text variant="bodySmall" style={styles.role}>
              Role: {user?.role || 'user'}
            </Text>
          </View>
        </View>
      </Surface>

      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={{ color: theme.colors.placeholder }}>Account</List.Subheader>
          <List.Item
            title="Email"
            titleStyle={{ color: theme.colors.onSurface }}
            description={user?.email}
            descriptionStyle={{ color: theme.colors.placeholder }}
            left={(props) => <List.Icon {...props} icon="email" color={theme.colors.onSurface} />}
          />
          <List.Item
            title="Member since"
            titleStyle={{ color: theme.colors.onSurface }}
            description={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            descriptionStyle={{ color: theme.colors.placeholder }}
            left={(props) => <List.Icon {...props} icon="calendar" color={theme.colors.onSurface} />}
          />
        </List.Section>
      </Surface>

      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={{ color: theme.colors.placeholder }}>App Settings</List.Subheader>
          <List.Item
            title="Notifications"
            titleStyle={{ color: theme.colors.onSurface }}
            description="Manage push notifications"
            descriptionStyle={{ color: theme.colors.placeholder }}
            left={(props) => <List.Icon {...props} icon="bell" color={theme.colors.onSurface} />}
            onPress={() => Alert.alert('Info', 'Notification settings coming soon')}
          />
          <List.Item
            title="Privacy Policy"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="shield" color={theme.colors.onSurface} />}
            onPress={() => Alert.alert('Info', 'Privacy policy coming soon')}
          />
          <List.Item
            title="Terms of Service"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="file-document" color={theme.colors.onSurface} />}
            onPress={() => Alert.alert('Info', 'Terms of service coming soon')}
          />
        </List.Section>
      </Surface>

      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={{ color: theme.colors.placeholder }}>Actions</List.Subheader>
          <List.Item
            title="Sign Out"
            titleStyle={{ color: theme.colors.onSurface }}
            left={(props) => <List.Icon {...props} icon="logout" color={theme.colors.onSurface} />}
            onPress={handleLogout}
          />
          <Divider style={{ backgroundColor: theme.colors.outline }} />
          <List.Item
            title="Delete Account & Data"
            titleStyle={{ color: theme.colors.error }}
            left={(props) => <List.Icon {...props} icon="delete" color={theme.colors.error} />}
            onPress={handleDeleteAccount}
          />
        </List.Section>
      </Surface>

      <View style={styles.versionContainer}>
        <Text variant="bodySmall" style={styles.version}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...shadows.card,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  email: {
    color: theme.colors.placeholder,
    marginTop: 4,
  },
  role: {
    color: theme.colors.placeholder,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...shadows.card,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 16,
  },
  version: {
    color: theme.colors.placeholder,
  },
}); 