import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl } from 'react-native';
import { Text, Chip, Surface, Searchbar } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { getPublicReports, updateReportStatus } from '../../services/reports';
import { Report } from '../../types';

export default function AdminDashboardScreen({ navigation }: any) {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin()) {
      Alert.alert('Access Denied', 'Only administrators can access this screen');
      navigation.goBack();
      return;
    }
    loadReports();
  }, []);

  useEffect(() => {
    filterReports();
  }, [reports, searchQuery, statusFilter]);

  const loadReports = async () => {
    try {
      const publicReports = await getPublicReports();
      setReports(publicReports);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const filterReports = () => {
    let filtered = reports;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(report => report.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(report =>
        report.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.addressText.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredReports(filtered);
  };

  const handleStatusUpdate = async (reportId: string, newStatus: Report['status']) => {
    try {
      await updateReportStatus(reportId, newStatus);
      await loadReports();
      Alert.alert('Success', 'Status updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return '#FF9800';
      case 'in_progress':
        return '#2196F3';
      case 'resolved':
        return '#4CAF50';
      default:
        return '#757575';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusCount = (status: string) => {
    return reports.filter(report => report.status === status).length;
  };

  if (!isAdmin()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header}>
        <Text variant="headlineSmall">Admin Dashboard</Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Manage community reports
        </Text>
      </Surface>

      <Surface style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text variant="headlineMedium">{getStatusCount('new')}</Text>
                      <Text variant="bodySmall">New</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="headlineMedium">{getStatusCount('in_progress')}</Text>
                      <Text variant="bodySmall">In Progress</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="headlineMedium">{getStatusCount('resolved')}</Text>
                      <Text variant="bodySmall">Resolved</Text>
        </View>
        <View style={styles.stat}>
          <Text variant="headlineMedium">{reports.length}</Text>
                      <Text variant="bodySmall">Total</Text>
        </View>
      </Surface>

      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search reports..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilters}>
          <Chip
            selected={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
            style={styles.filterChip}
          >
            All
          </Chip>
          <Chip
            selected={statusFilter === 'new'}
            onPress={() => setStatusFilter('new')}
            style={styles.filterChip}
          >
            New
          </Chip>
          <Chip
            selected={statusFilter === 'in_progress'}
            onPress={() => setStatusFilter('in_progress')}
            style={styles.filterChip}
          >
            In Progress
          </Chip>
          <Chip
            selected={statusFilter === 'resolved'}
            onPress={() => setStatusFilter('resolved')}
            style={styles.filterChip}
          >
            Resolved
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.reportsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReports.map((report) => (
          <Surface key={report.id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportInfo}>
                <Text variant="bodyMedium" style={styles.reportDescription} numberOfLines={2}>
                  {report.description}
                </Text>
                <Text variant="bodySmall" style={styles.reportLocation}>
                  📍 {report.addressText}
                </Text>
                <Text variant="bodySmall" style={styles.reportDate}>
                  {formatDate(report.createdAt)}
                </Text>
              </View>
              <View style={styles.reportStats}>
                <Chip
                  mode="outlined"
                  textStyle={{ color: getStatusColor(report.status) }}
                  style={[styles.statusChip, { borderColor: getStatusColor(report.status) }]}
                >
                  {report.status.replace('_', ' ').toUpperCase()}
                </Chip>
                <Text variant="bodySmall">AI: {report.urgencyScore.toFixed(1)}</Text>
                <Text variant="bodySmall">Votes: {report.voteCount}</Text>
              </View>
            </View>
            
            <View style={styles.reportActions}>
              <Chip
                mode="outlined"
                onPress={() => handleStatusUpdate(report.id, 'in_progress')}
                style={styles.actionChip}
              >
                Mark In Progress
              </Chip>
              <Chip
                mode="outlined"
                onPress={() => handleStatusUpdate(report.id, 'resolved')}
                style={styles.actionChip}
              >
                Mark Resolved
              </Chip>
              <Chip
                mode="outlined"
                onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                style={styles.actionChip}
              >
                View Details
              </Chip>
            </View>
          </Surface>
        ))}
        
        {filteredReports.length === 0 && (
          <Surface style={styles.emptyState}>
            <Text variant="bodyMedium" style={styles.emptyText}>
              No reports found
            </Text>
          </Surface>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'white',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  filtersContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 12,
  },
  statusFilters: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  reportsList: {
    flex: 1,
    marginHorizontal: 16,
  },
  reportCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
    marginRight: 12,
  },
  reportDescription: {
    marginBottom: 4,
  },
  reportLocation: {
    color: '#666',
    marginBottom: 2,
  },
  reportDate: {
    color: '#666',
  },
  reportStats: {
    alignItems: 'flex-end',
  },
  statusChip: {
    height: 24,
    marginBottom: 4,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionChip: {
    flex: 1,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    borderRadius: 8,
  },
  emptyText: {
    color: '#666',
  },
}); 