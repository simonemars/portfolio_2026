import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Surface, Button, Avatar, Chip, FAB } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { getUserReports } from '../services/reports';
import { Report } from '../types';

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
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

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
      >
        <Chip
          selected={selectedFilter === 'all'}
          onPress={() => setSelectedFilter('all')}
          style={styles.filterChip}
        >
          All ({reports.length})
        </Chip>
        <Chip
          selected={selectedFilter === 'new'}
          onPress={() => setSelectedFilter('new')}
          style={styles.filterChip}
        >
          New ({reports.filter(r => r.status === 'new').length})
        </Chip>
        <Chip
          selected={selectedFilter === 'in_progress'}
          onPress={() => setSelectedFilter('in_progress')}
          style={styles.filterChip}
        >
          In Progress ({reports.filter(r => r.status === 'in_progress').length})
        </Chip>
        <Chip
          selected={selectedFilter === 'resolved'}
          onPress={() => setSelectedFilter('resolved')}
          style={styles.filterChip}
        >
          Resolved ({reports.filter(r => r.status === 'resolved').length})
        </Chip>
      </ScrollView>

      {/* Reports List */}
      <ScrollView 
        style={styles.reportsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReports.map((report) => (
          <Surface key={report.id} style={styles.reportCard}>
            {/* Report Header */}
            <View style={styles.reportHeader}>
              <View style={styles.reportInfo}>
                <Text variant="bodyMedium" style={styles.description}>
                  {report.description}
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

            {/* Location */}
            <View style={styles.locationContainer}>
              <Text variant="bodySmall" style={styles.locationText}>
                📍 {report.addressText}
              </Text>
            </View>

            {/* Photos */}
            {report.photoUrls && report.photoUrls.length > 0 && (
              <View style={styles.photoContainer}>
                <View style={styles.photoHeader}>
                  <Text variant="bodyMedium" style={styles.photoCount}>
                    📸 {report.photoUrls.length} photo{report.photoUrls.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.photoScroll}
                >
                  {report.photoUrls.map((photoUrl, index) => (
                    <View key={index} style={styles.photoWrapper}>
                      <Image 
                        source={{ uri: photoUrl }} 
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Report Footer */}
            <View style={styles.reportFooter}>
              <View style={styles.statsContainer}>
                <View style={styles.stat}>
                  <Text variant="bodySmall" style={styles.statLabel}>Urgency</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {report.urgencyScore.toFixed(1)}/10
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text variant="bodySmall" style={styles.statLabel}>Votes</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    👍 {report.voteCount}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text variant="bodySmall" style={styles.statLabel}>Visibility</Text>
                  <Text variant="bodyMedium" style={styles.statValue}>
                    {report.isPublic ? 'Public' : 'Private'}
                  </Text>
                </View>
              </View>
              
              <Button 
                mode="outlined" 
                onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
                style={styles.detailButton}
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
              Create your first report to get started!
            </Text>
            <Button 
              mode="contained" 
              onPress={handleCreateReport}
              style={styles.createButton}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filterContainer: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  reportsContainer: {
    flex: 1,
  },
  reportCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 16,
    lineHeight: 22,
    color: '#1a1a1a',
  },
  timestamp: {
    color: '#666',
    fontSize: 14,
  },
  statusChip: {
    height: 24,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationText: {
    color: '#666',
    fontSize: 14,
    lineHeight: 18,
  },
  photoContainer: {
    marginBottom: 16,
  },
  photoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  photoCount: {
    fontWeight: '600',
    fontSize: 16,
    color: '#1a1a1a',
  },
  photoScroll: {
    paddingHorizontal: 4,
  },
  photoWrapper: {
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontWeight: '600',
    fontSize: 14,
    color: '#1a1a1a',
  },
  detailButton: {
    height: 36,
  },
  emptyState: {
    margin: 32,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  createButton: {
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 