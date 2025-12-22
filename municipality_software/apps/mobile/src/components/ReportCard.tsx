import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, Avatar } from 'react-native-paper';
import { Report } from '../types';
import { theme, shadows } from '../theme';

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
                {report.status.replace('_', ' ')}
              </Chip>
              {!report.isPublic && (
                <Chip mode="outlined" style={styles.privateChip} textStyle={{ color: theme.colors.onSurface }}>
                  Private
                </Chip>
              )}
            </View>
            <Text variant="bodySmall" style={styles.date}>
              {formatDate(report.createdAt)}
            </Text>
          </View>

          <Text variant="titleMedium" style={styles.description}>
            {report.description}
          </Text>

          <View style={styles.addressRow}>
            <Text variant="bodySmall" style={styles.address}>
              {report.addressText}
            </Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.stats}>
              <Text variant="labelSmall" style={styles.statsText}>VOTES: {report.voteCount}</Text>
            </View>
            
            {showVoteButton && report.isPublic && (
              <Chip
                mode="outlined"
                onPress={onVote}
                style={styles.voteChip}
                textStyle={{ color: theme.colors.onSurface }}
              >
                Vote
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
    marginVertical: 8,
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusChip: {
    backgroundColor: 'transparent',
    marginRight: 8,
    height: 32,
  },
  privateChip: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.outline,
    height: 32,
  },
  date: {
    color: theme.colors.placeholder,
    fontSize: 12,
  },
  description: {
    marginBottom: 8,
    color: theme.colors.onSurface,
  },
  addressRow: {
    marginBottom: 16,
  },
  address: {
    color: theme.colors.placeholder,
    fontSize: 13,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    paddingTop: 12,
  },
  stats: {
    flexDirection: 'row',
    gap: 12,
  },
  statsText: {
    color: theme.colors.placeholder,
  },
  voteChip: {
    borderColor: theme.colors.outline,
    backgroundColor: 'transparent',
  },
}); 