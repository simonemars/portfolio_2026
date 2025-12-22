import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { List, Button, Text, Surface, Divider, Avatar } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../services/firebase';

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
    <ScrollView style={styles.container}>
      <Surface style={styles.profileSection}>
        <View style={styles.profileHeader}>
          <Avatar.Text size={80} label={user?.displayName?.[0] || user?.email?.[0] || 'U'} />
          <View style={styles.profileInfo}>
            <Text variant="headlineSmall">{user?.displayName || 'User'}</Text>
            <Text variant="bodyMedium" style={styles.email}>{user?.email}</Text>
            <Text variant="bodySmall" style={styles.role}>
              Role: {user?.role || 'user'}
            </Text>
          </View>
        </View>
      </Surface>

      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Email"
            description={user?.email}
            left={(props) => <List.Icon {...props} icon="email" />}
          />
          <List.Item
            title="Member since"
            description={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            left={(props) => <List.Icon {...props} icon="calendar" />}
          />
        </List.Section>
      </Surface>

      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader>App Settings</List.Subheader>
          <List.Item
            title="Notifications"
            description="Manage push notifications"
            left={(props) => <List.Icon {...props} icon="bell" />}
            onPress={() => Alert.alert('Info', 'Notification settings coming soon')}
          />
          <List.Item
            title="Privacy Policy"
            left={(props) => <List.Icon {...props} icon="shield" />}
            onPress={() => Alert.alert('Info', 'Privacy policy coming soon')}
          />
          <List.Item
            title="Terms of Service"
            left={(props) => <List.Icon {...props} icon="file-document" />}
            onPress={() => Alert.alert('Info', 'Terms of service coming soon')}
          />
        </List.Section>
      </Surface>

      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader>Actions</List.Subheader>
          <List.Item
            title="Sign Out"
            left={(props) => <List.Icon {...props} icon="logout" />}
            onPress={handleLogout}
          />
          <Divider />
          <List.Item
            title="Delete Account & Data"
            titleStyle={{ color: '#f44336' }}
            left={(props) => <List.Icon {...props} icon="delete" color="#f44336" />}
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
    backgroundColor: '#f5f5f5',
  },
  profileSection: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
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
    color: '#666',
    marginTop: 4,
  },
  role: {
    color: '#666',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  versionContainer: {
    alignItems: 'center',
    padding: 16,
  },
  version: {
    color: '#666',
  },
}); 