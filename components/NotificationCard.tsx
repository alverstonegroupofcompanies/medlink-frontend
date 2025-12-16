import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, CheckCircle, XCircle, AlertTriangle, Navigation as NavigationIcon } from 'lucide-react-native';
import { VibrantColors, VibrantShadows } from '@/constants/vibrant-theme';
import { HapticFeedback } from '@/utils/haptics';

type NotificationType =
  | 'trip_started'
  | 'trip_location_updated'
  | 'trip_arrived'
  | 'trip_completed'
  | 'trip_on_the_way'
  | 'job_approved'
  | 'job_rejected'
  | 'application_rejected'
  | string;

interface Props {
  notification: {
    id: number;
    title: string;
    message: string;
    type: NotificationType;
    is_read: boolean;
    created_at: string;
    data?: Record<string, any>;
  };
  onPress?: () => void;
  onDelete?: () => void;
}

export const NotificationCard: React.FC<Props> = ({ notification, onPress, onDelete }) => {
  const { title, message, type, is_read, created_at } = notification;
  const meta = getMeta(type);

  const handlePress = () => {
    HapticFeedback.light();
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[styles.card, meta.containerStyle, !is_read && styles.unread]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={[styles.iconContainer, { backgroundColor: meta.bg }]}>
        <meta.icon color={meta.color} size={18} />
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: VibrantColors.neutral.gray900 }]}>{title}</Text>
          <Text style={[styles.timestamp, { color: VibrantColors.neutral.gray500 }]}>
            {formatTime(created_at)}
          </Text>
        </View>
        <Text style={[styles.message, { color: VibrantColors.neutral.gray700 }]} numberOfLines={3}>
          {message}
        </Text>
      </View>

      {onDelete && (
        <TouchableOpacity onPress={onDelete} style={styles.delete}>
          <XCircle size={18} color={VibrantColors.error.main} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const getMeta = (type: NotificationType) => {
  switch (type) {
    case 'trip_started':
    case 'trip_on_the_way':
      return {
        icon: Navigation,
        color: VibrantColors.primary.main,
        bg: VibrantColors.primary.lightest,
        containerStyle: styles.highlightCard,
      };
    case 'trip_arrived':
    case 'trip_completed':
      return {
        icon: CheckCircle,
        color: VibrantColors.success.main,
        bg: VibrantColors.success.lighter,
        containerStyle: styles.successCard,
      };
    case 'application_rejected':
      return {
        icon: AlertTriangle,
        color: VibrantColors.error.main,
        bg: VibrantColors.error.lighter,
        containerStyle: styles.errorCard,
      };
    case 'job_approved':
      return {
        icon: CheckCircle,
        color: VibrantColors.success.main,
        bg: VibrantColors.success.lighter,
        containerStyle: styles.successCard,
      };
    default:
      return {
        icon: Bell,
        color: VibrantColors.primary.main,
        bg: VibrantColors.primary.lightest,
        containerStyle: styles.neutralCard,
      };
  }
};

const formatTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return '';
  }
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: VibrantColors.neutral.white,
    marginBottom: 12,
    ...VibrantShadows.soft,
  },
  unread: {
    borderWidth: 1,
    borderColor: VibrantColors.primary.light,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  timestamp: {
    fontSize: 12,
  },
  delete: {
    paddingLeft: 12,
  },
  highlightCard: {
    borderLeftWidth: 4,
        borderLeftColor: VibrantColors.primary.main,
  },
  successCard: {
    borderLeftWidth: 4,
    borderLeftColor: VibrantColors.success.main,
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: VibrantColors.error.main,
  },
  neutralCard: {
    borderLeftWidth: 4,
    borderLeftColor: VibrantColors.primary.main,
  },
});

function Navigation(props: any) {
  return <Navigation {...props} />;
}

