import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ModernColors, Typography, Shadows, BorderRadius, Spacing } from '@/constants/modern-theme';
import { Calendar, Clock, MapPin, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react-native';

interface MinimalSessionCardProps {
  session: any;
  onPress: () => void;
}

export const MinimalSessionCard: React.FC<MinimalSessionCardProps> = ({ session, onPress }) => {
  const hospitalName = session.job_requirement?.hospital?.name || 'Unknown Hospital';
  const status = session.status;
  
  // Format date
  const date = session.session_date ? new Date(session.session_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  }) : 'TBD';

  // Determine status color and label
  const getStatusInfo = () => {
    switch (status) {
      case 'completed':
        return { color: ModernColors.success.main, bg: ModernColors.success.light, label: 'Completed', icon: CheckCircle };
      case 'cancelled':
        return { color: ModernColors.error.main, bg: ModernColors.error.light, label: 'Cancelled', icon: AlertCircle };
      case 'scheduled':
        return { color: ModernColors.primary.main, bg: ModernColors.primary.light, label: 'Scheduled', icon: Calendar };
      case 'in_progress':
        return { color: ModernColors.warning.main, bg: ModernColors.warning.light, label: 'Active', icon: Clock };
      default:
        return { color: ModernColors.neutral.gray500, bg: ModernColors.neutral.gray100, label: status, icon: AlertCircle };
    }
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: statusInfo.bg }]}>
            <StatusIcon size={16} color={statusInfo.color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.hospitalName} numberOfLines={1}>{hospitalName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.date}>{date}</Text>
              <View style={styles.dot} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.rightSection}>
            {session.payment_amount && (
                <Text style={styles.amount}>₹{Math.floor(session.payment_amount)}</Text>
            )}
            <ChevronRight size={16} color={ModernColors.neutral.gray400} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ModernColors.neutral.gray200,
    ...Shadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  hospitalName: {
    ...Typography.body2,
    fontWeight: '700',
    color: ModernColors.text.primary,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  date: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: ModernColors.neutral.gray300,
    marginHorizontal: 6,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  amount: {
      ...Typography.body2,
      fontWeight: '700',
      color: ModernColors.text.primary,
  }
});
