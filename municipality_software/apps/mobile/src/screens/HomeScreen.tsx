import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, RefreshControl, Image, Dimensions } from 'react-native';
import { FAB, Chip, Text, Surface, Button, Avatar } from 'react-native-paper';
import MapView, { Marker } from 'react-native-maps';
import { useAuth } from '../hooks/useAuth';
import { getPublicReports } from '../services/reports';
import { Report } from '../types';
import ReportCard from '../components/ReportCard';
import { theme } from '../theme';

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

  const renderFeedView = () => (
    <ScrollView 
      style={styles.feedContainer}
      contentInsetAdjustmentBehavior="never"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.onBackground} />
      }
    >
      {filteredReports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          onPress={() => navigation.navigate('ReportDetail', { reportId: report.id })}
          showVoteButton={true}
          onVote={() => {
            // TODO: Implement vote logic
            console.log('Vote clicked for report:', report.id);
          }}
        />
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
        userInterfaceStyle="dark"
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
        <Text variant="labelSmall" style={styles.legendTitle}>STATUS LEGEND:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
            <Text variant="bodySmall" style={styles.legendText}>New</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2196F3' }]} />
            <Text variant="bodySmall" style={styles.legendText}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text variant="bodySmall" style={styles.legendText}>Resolved</Text>
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

      {/* View Toggle Buttons */}
      <View style={styles.viewToggleContainer}>
        <Button
          mode={viewMode === 'feed' ? 'contained' : 'outlined'}
          onPress={() => setViewMode('feed')}
          style={[styles.viewButton, viewMode === 'feed' && { backgroundColor: theme.colors.primary }]}
          textColor={viewMode === 'feed' ? theme.colors.onPrimary : theme.colors.onSurface}
          icon="format-list-bulleted"
        >
          Feed
        </Button>
        <Button
          mode={viewMode === 'map' ? 'contained' : 'outlined'}
          onPress={() => setViewMode('map')}
          style={[styles.viewButton, viewMode === 'map' && { backgroundColor: theme.colors.primary }]}
          textColor={viewMode === 'map' ? theme.colors.onPrimary : theme.colors.onSurface}
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
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  viewButton: {
    flex: 1,
    marginHorizontal: 4,
    borderColor: theme.colors.outline,
  },
  feedContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    backgroundColor: theme.colors.surface,
    opacity: 0.95,
  },
  legendTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: theme.colors.onSurface,
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
  legendText: {
    color: theme.colors.onSurface,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
}); 