import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl, Image, Dimensions } from 'react-native';
import { FAB, Chip, Text, Surface, Button, Avatar } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../hooks/useAuth';
import { getPublicReports } from '../services/reports';
import { Report } from '../types';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'new' | 'in_progress' | 'resolved'>('all');
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadReports();
  }, [selectedFilter]);

  const loadReports = async () => {
    try {
      const publicReports = await getPublicReports();
      setReports(publicReports);
    } catch (error) {
      Alert.alert('Error', 'Failed to load reports');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleMarkerPress = (report: Report) => {
    setSelectedReport(report);
    setModalVisible(true);
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

  const renderFeedView = () => (
    <ScrollView 
      style={styles.feedContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {filteredReports.map((report) => (
        <Surface key={report.id} style={styles.reportCard}>
          {/* Report Header */}
          <View style={styles.reportHeader}>
            <Avatar.Text 
              size={40} 
              label={report.userId === 'test-user' ? 'TU' : report.userId === 'test-admin' ? 'TA' : 'U'} 
            />
            <View style={styles.reportInfo}>
              <Text variant="bodyMedium" style={styles.userName}>
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
          <Text variant="bodyMedium" style={styles.description}>
            {report.description}
          </Text>

          {/* Location */}
          <View style={styles.locationContainer}>
            <Text variant="bodySmall" style={styles.locationText}>
              📍 {report.addressText}
            </Text>
          </View>

          {/* Photos */}
          {report.photoUrls.length > 0 && (
            <View style={styles.photoContainer}>
              <Image source={{ uri: report.photoUrls[0] }} style={styles.photo} />
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
            Be the first to report an issue in your area!
          </Text>
        </Surface>
      )}
    </ScrollView>
  );

  const renderMapView = () => (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 44.8666, // Pula, Croatia
          longitude: 13.8496,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {filteredReports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
            }}
            title={report.description}
            description={`${getStatusText(report.status)} • ${report.voteCount} votes`}
            pinColor={getStatusColor(report.status)}
            onPress={() => handleMarkerPress(report)}
          />
        ))}
      </MapView>

      {/* Map Legend */}
      <Surface style={styles.mapLegend}>
        <Text variant="bodySmall" style={styles.legendTitle}>Status Legend:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text variant="bodySmall">New</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text variant="bodySmall">In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text variant="bodySmall">Resolved</Text>
          </View>
        </View>
      </Surface>
    </View>
  );

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

      {/* View Toggle Buttons */}
      <View style={styles.viewToggleContainer}>
        <Button
          mode={viewMode === 'feed' ? 'contained' : 'outlined'}
          onPress={() => setViewMode('feed')}
          style={styles.viewButton}
          icon="format-list-bulleted"
        >
          Feed
        </Button>
        <Button
          mode={viewMode === 'map' ? 'contained' : 'outlined'}
          onPress={() => setViewMode('map')}
          style={styles.viewButton}
          icon="map"
        >
          Map
        </Button>
      </View>

      {/* Content */}
      {viewMode === 'feed' ? renderFeedView() : renderMapView()}

      {/* Floating Action Button */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateReport}
        label="Report Issue"
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
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  viewButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  feedContainer: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapLegend: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItems: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  reportCard: {
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontWeight: '600',
  },
  timestamp: {
    color: '#666',
    marginTop: 2,
  },
  statusChip: {
    height: 24,
  },
  description: {
    marginBottom: 12,
    lineHeight: 20,
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationText: {
    color: '#666',
  },
  photoContainer: {
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
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
    gap: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  statValue: {
    fontWeight: '600',
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
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
}); 