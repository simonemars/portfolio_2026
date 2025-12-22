import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Surface, Button, Avatar, Chip, FAB } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { getUserReports } from '../services/reports';
import { Report } from '../types';
import ReportCard from '../components/ReportCard';
import { theme } from '../theme';

export default function MyReportsScreen({ navigation }: any) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user, selectedFilter]);

  const loadReports = async () => {
    if (!user) return;
    
    try {
      const userReports = await getUserReports(user.uid);
      setReports(userReports);
    } catch (error) {
      Alert.alert('Error', 'Failed to load your reports');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleCreateReport = () => {
    navigation.navigate('New Report');
  };

  const filteredReports = reports.filter(report => {
    if (selectedFilter === 'all') return true;
    return report.status === selectedFilter;
  });

  if (!user) {
    return (
      <View style={styles.container}>
        <Surface style={styles.emptyState}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Please log in to view your reports
          </Text>
        </Surface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
        contentInsetAdjustmentBehavior="never"
      >
        <Chip
          selected={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
          style={[
            styles.filterChip, 
            selectedFilter === 'all' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: selectedFilter === 'all' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          All ({reports.length})
        </Chip>
        <Chip
          selected={selectedFilter === 'new'}
          onPress={() => setSelectedFilter('new')}
          style={[
            styles.filterChip, 
            selectedFilter === 'new' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: selectedFilter === 'new' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          New ({reports.filter(r => r.status === 'new').length})
        </Chip>
        <Chip
          selected={selectedFilter === 'in_progress'}
          onPress={() => setSelectedFilter('in_progress')}
          style={[
            styles.filterChip, 
            selectedFilter === 'in_progress' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: selectedFilter === 'in_progress' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          In Progress ({reports.filter(r => r.status === 'in_progress').length})
        </Chip>
        <Chip
          selected={selectedFilter === 'resolved'}
          onPress={() => setSelectedFilter('resolved')}
          style={[
            styles.filterChip, 
            selectedFilter === 'resolved' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: selectedFilter === 'resolved' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          Resolved ({reports.filter(r => r.status === 'resolved').length})
        </Chip>
      </ScrollView>

      {/* Reports List */}
      <ScrollView
        style={styles.feedContainer}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.onBackground}
          />
        }
      >
        {filteredReports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
          />
        ))}

        {filteredReports.length === 0 && (
          <Surface style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No reports found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Create your first report to get started!
            </Text>
            <Button 
              mode="contained" 
              onPress={handleCreateReport}
              style={styles.createButton}
              textColor={theme.colors.onPrimary}
              buttonColor={theme.colors.primary}
            >
              Create Report
            </Button>
          </Surface>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateReport}
        label="New Report"
        color={theme.colors.onPrimary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  filterContainer: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: 'transparent',
    borderColor: theme.colors.outline,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  emptyState: {
    margin: 32,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
  },
  emptyText: {
    marginBottom: 8,
    textAlign: 'center',
    color: theme.colors.onSurface,
  },
  emptySubtext: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
  createButton: {
    marginTop: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
}); 