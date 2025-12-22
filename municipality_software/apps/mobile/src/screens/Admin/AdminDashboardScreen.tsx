import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert, RefreshControl } from 'react-native';
import { Text, Chip, Surface, Searchbar, Avatar, Button } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';
import { getPublicReports, updateReportStatus } from '../../services/reports';
import { Report } from '../../types';
import { theme, shadows } from '../../theme';

export default function AdminDashboardScreen({ navigation }: { navigation: any }) {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'new':
        return 'New';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return status;
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
        <Searchbar
          placeholder="Search reports..."
          placeholderTextColor={theme.colors.placeholder}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          inputStyle={{ color: theme.colors.onSurface }}
          iconColor={theme.colors.onSurface}
        />
      </Surface>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
        contentInsetAdjustmentBehavior="never"
      >
        <Chip
          selected={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
          style={[
            styles.filterChip, 
            statusFilter === 'all' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: statusFilter === 'all' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          All ({reports.length})
        </Chip>
        <Chip
          selected={statusFilter === 'new'}
          onPress={() => setStatusFilter('new')}
          style={[
            styles.filterChip, 
            statusFilter === 'new' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: statusFilter === 'new' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          New ({getStatusCount('new')})
        </Chip>
        <Chip
          selected={statusFilter === 'in_progress'}
          onPress={() => setStatusFilter('in_progress')}
          style={[
            styles.filterChip, 
            statusFilter === 'in_progress' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: statusFilter === 'in_progress' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          In Progress ({getStatusCount('in_progress')})
        </Chip>
        <Chip
          selected={statusFilter === 'resolved'}
          onPress={() => setStatusFilter('resolved')}
          style={[
            styles.filterChip, 
            statusFilter === 'resolved' && { backgroundColor: theme.colors.primary }
          ]}
          textStyle={{ color: statusFilter === 'resolved' ? theme.colors.onPrimary : theme.colors.onSurface }}
          mode="outlined"
        >
          Resolved ({getStatusCount('resolved')})
        </Chip>
      </ScrollView>

      <ScrollView
        style={styles.feedContainer}
        contentInsetAdjustmentBehavior="never"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.onBackground} />
        }
      >
        {filteredReports.map((report) => (
          <Surface key={report.id} style={styles.reportCard}>
            {/* Report Header */}
            <View style={styles.reportHeader}>
              <Avatar.Text 
                size={40} 
                label={report.userId === 'test-user' ? 'TU' : report.userId === 'test-admin' ? 'TA' : 'U'}
                style={{ backgroundColor: theme.colors.primaryContainer }}
                color={theme.colors.onPrimaryContainer}
              />
              <View style={styles.reportInfo}>
                <Text variant="bodyMedium" style={styles.userName} numberOfLines={2} ellipsizeMode="tail">
                  {report.userId === 'test-user' ? 'Test User' : 
                   report.userId === 'test-admin' ? 'Test Admin' : 'Anonymous User'}
                </Text>
                <Text variant="bodySmall" style={styles.timestamp}>
                  {formatDate(report.createdAt)}
                </Text>
              </View>
              <Chip
                mode="outlined"
                textStyle={{ color: getStatusColor(report.status) }}
                style={[styles.statusChip, { borderColor: getStatusColor(report.status) }]}
              >
                {getStatusText(report.status)}
              </Chip>
            </View>

            {/* Report Content */}
            <Text variant="titleMedium" style={styles.description}>
              {report.description}
            </Text>

            {/* Location */}
            <View style={styles.locationContainer}>
            <Text variant="bodySmall" style={styles.locationText} numberOfLines={2} ellipsizeMode="tail">
              {report.addressText}
            </Text>
            </View>

            {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text variant="bodySmall" style={styles.statLabel}>Votes</Text>
              <Text variant="bodyMedium" style={styles.statValue}>
                {report.voteCount}
              </Text>
            </View>
          </View>
            
            {/* Admin Actions */}
            <View style={styles.reportActions}>
              <Button
                mode="outlined"
                onPress={() => handleStatusUpdate(report.id, 'in_progress')}
                style={styles.actionButton}
                compact={true}
                textColor={theme.colors.onSurface}
                buttonColor="transparent"
              >
                In Progress
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleStatusUpdate(report.id, 'resolved')}
                style={styles.actionButton}
                compact={true}
                textColor={theme.colors.onSurface}
                buttonColor="transparent"
              >
                Resolved
              </Button>
              <Button
                mode="contained"
                onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                style={styles.detailButton}
                icon="arrow-right"
                compact={true}
                buttonColor={theme.colors.primary}
                textColor={theme.colors.onPrimary}
              >
                View Details
              </Button>
            </View>
          </Surface>
        ))}
        
        {filteredReports.length === 0 && (
          <Surface style={styles.emptyState}>
            <Text variant="bodyLarge" style={styles.emptyText}>
              No reports found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search criteria' : 'No reports match the current filter'}
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
    backgroundColor: theme.colors.background,
  },
  header: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  searchbar: {
    marginBottom: 0,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.outline,
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
  reportCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...shadows.card,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  userName: {
    fontWeight: '600',
    flexWrap: 'wrap',
    color: theme.colors.onSurface,
  },
  timestamp: {
    color: theme.colors.placeholder,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  statusChip: {
    flexShrink: 0,
    backgroundColor: 'transparent',
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
    flexWrap: 'wrap',
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationText: {
    color: theme.colors.placeholder,
    flexWrap: 'wrap',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: theme.colors.placeholder,
    fontSize: 12,
  },
  statValue: {
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  actionButton: {
    flex: 1,
    minWidth: 80,
    borderColor: theme.colors.outline,
  },
  detailButton: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    flexShrink: 0,
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
    color: theme.colors.placeholder,
    textAlign: 'center',
  },
}); 