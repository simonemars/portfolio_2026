import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, Avatar } from 'react-native-paper';
import { Report } from '../types';

interface ReportCardProps {
  report: Report;
  onPress?: () => void;
  showVoteButton?: boolean;
  onVote?: () => void;
}

export default function ReportCard({ report, onPress, showVoteButton = false, onVote }: ReportCardProps) {
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

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
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

          <Text variant="bodyMedium" style={styles.description}>
            {report.description}
          </Text>

                  <Text variant="bodySmall" style={styles.address}>
          📍 {report.addressText}
        </Text>

          <View style={styles.footer}>
            <View style={styles.stats}>
                      <Text variant="bodySmall">AI Score: {report.urgencyScore.toFixed(1)}</Text>
        <Text variant="bodySmall">Upvotes: {report.voteCount}</Text>
            </View>
            
            {showVoteButton && report.isPublic && (
              <Chip
                mode="outlined"
                onPress={onVote}
                style={styles.voteChip}
              >
                👍 Vote
              </Chip>
            )}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
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
    marginBottom: 8,
  },
  address: {
    color: '#666',
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    gap: 4,
  },
  voteChip: {
    height: 32,
  },
}); 