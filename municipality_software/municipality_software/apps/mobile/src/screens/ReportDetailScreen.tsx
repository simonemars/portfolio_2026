import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Image } from 'react-native';
import { Text, Button, Chip, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { getReport, voteReport, updateReportStatus } from '../services/reports';
import { Report } from '../types';

interface ReportDetailScreenProps {
  route: { params: { reportId: string } };
  navigation: any;
}

export default function ReportDetailScreen({ route, navigation }: ReportDetailScreenProps) {
  const { reportId } = route.params;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    loadReport();
  }, [reportId]);

  const loadReport = async () => {
    try {
      const reportData = await getReport(reportId);
      setReport(reportData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to vote');
      return;
    }

    setVoting(true);
    try {
      await voteReport(reportId, user.uid);
      await loadReport(); // Reload to get updated vote count
      Alert.alert('Success', 'Vote recorded successfully');
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to vote');
    } finally {
      setVoting(false);
    }
  };

  const handleStatusUpdate = async (newStatus: Report['status']) => {
    if (!isAdmin()) {
      Alert.alert('Error', 'Only admins can update report status');
      return;
    }

    try {
      await updateReportStatus(reportId, newStatus);
      await loadReport(); // Reload to get updated status
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
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text>Loading report...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.errorContainer}>
        <Text>Report not found</Text>
      </View>
    );
  }

  const canVote = report.isPublic && user;
  const hasVoted = false; // TODO: Implement proper vote tracking

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.surface}>
        <View style={styles.header}>
          <View style={styles.statusContainer}>
            <Chip
              mode="outlined"
              textStyle={{ color: getStatusColor(report.status) }}
              style={[styles.statusChip, { borderColor: getStatusColor(report.status) }]}
            >
              {report.status.replace('_', ' ').toUpperCase()}
            </Chip>
            {!report.isPublic && (
              <Chip mode="outlined" style={styles.privateChip}>
                Private
              </Chip>
            )}
          </View>
          <Text variant="bodySmall" style={styles.date}>
            {formatDate(report.createdAt)}
          </Text>
        </View>

        <Text variant="headlineSmall" style={styles.description}>
          {report.description}
        </Text>

        <View style={styles.locationContainer}>
          <Text variant="bodyMedium" style={styles.location}>
            📍 {report.addressText}
          </Text>
        </View>

        {report.photoUrls && report.photoUrls.length > 0 && (
          <View style={styles.photoSection}>
            <Text variant="bodyMedium" style={styles.sectionTitle}>
              Photos ({report.photoUrls.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {report.photoUrls.map((photoUrl, index) => (
                <Image
                  key={index}
                  source={{ uri: photoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        <Divider style={styles.divider} />

        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text variant="headlineSmall">{report.urgencyScore.toFixed(1)}</Text>
            <Text variant="bodySmall">AI Score</Text>
          </View>
          <View style={styles.stat}>
            <Text variant="headlineSmall">{report.voteCount}</Text>
            <Text variant="bodySmall">Upvotes</Text>
          </View>
        </View>

        {report.isPublic && (
          <View style={styles.voteSection}>
            {canVote ? (
              <Button
                mode="contained"
                onPress={handleVote}
                loading={voting}
                disabled={voting}
                style={styles.voteButton}
              >
                👍 I'm affected by this issue
              </Button>
            ) : hasVoted ? (
              <Chip mode="outlined" style={styles.votedChip}>
                ✅ You voted on this report
              </Chip>
            ) : null}
          </View>
        )}

        {isAdmin() && (
          <View style={styles.adminSection}>
            <Text variant="bodyMedium" style={styles.sectionTitle}>
              Admin Actions
            </Text>
            <View style={styles.statusButtons}>
              <Button
                mode="outlined"
                onPress={() => handleStatusUpdate('in_progress')}
                style={styles.statusButton}
              >
                Mark In Progress
              </Button>
              <Button
                mode="outlined"
                onPress={() => handleStatusUpdate('resolved')}
                style={styles.statusButton}
              >
                Mark Resolved
              </Button>
            </View>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surface: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusChip: {
    height: 24,
  },
  privateChip: {
    height: 24,
    backgroundColor: '#f0f0f0',
  },
  date: {
    color: '#666',
  },
  description: {
    marginBottom: 16,
  },
  locationContainer: {
    marginBottom: 16,
  },
  location: {
    color: '#666',
  },
  photoSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  divider: {
    marginVertical: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  voteSection: {
    marginBottom: 16,
  },
  voteButton: {
    marginTop: 8,
  },
  votedChip: {
    alignSelf: 'center',
  },
  adminSection: {
    marginTop: 16,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
  },
}); 