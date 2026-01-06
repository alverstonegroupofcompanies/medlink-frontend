import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { MaterialIcons } from '@expo/vector-icons';

interface PaymentStatusCardProps {
  hospitalApprovedAt: string | null;
  adminApprovedAt: string | null;
  approvalStatus: string;
  paymentStatus: string;
  amount: number | undefined | null;
  hospitalName?: string;
}

export function PaymentStatusCard({
  hospitalApprovedAt,
  adminApprovedAt,
  approvalStatus,
  paymentStatus,
  amount,
  hospitalName,
}: PaymentStatusCardProps) {
  const stages = [
    {
      id: 'held',
      label: 'Payment Held',
      icon: 'lock-clock',
      color: '#FF9800',
      completed: paymentStatus === 'held' || paymentStatus === 'paid',
    },
    {
      id: 'hospital',
      label: 'Hospital Approved',
      icon: 'check-circle',
      color: '#2196F3',
      completed: !!hospitalApprovedAt,
    },
    {
      id: 'admin',
      label: 'Admin Approved',
      icon: 'verified',
      color: '#9C27B0',
      completed: !!adminApprovedAt,
    },
    {
      id: 'released',
      label: 'Released',
      icon: 'account-balance-wallet',
      color: '#4CAF50',
      completed: paymentStatus === 'released',
    },
  ];

  const getCurrentStage = () => {
    if (paymentStatus === 'released') return 3;
    if (adminApprovedAt) return 2;
    if (hospitalApprovedAt) return 1;
    return 0;
  };

  const currentStage = getCurrentStage();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>Payment Status</ThemedText>
        {hospitalName && (
          <View style={styles.hospitalBadge}>
            <MaterialIcons name="local-hospital" size={14} color="#2196F3" />
            <ThemedText style={styles.hospitalName}>{hospitalName}</ThemedText>
          </View>
        )}
      </View>
      
      <View style={styles.amountContainer}>
        <ThemedText style={styles.amount}>
          ₹{amount != null && !isNaN(Number(amount)) ? Number(amount).toFixed(2) : '0.00'}
        </ThemedText>
      </View>

      <View style={styles.timeline}>
        {stages.map((stage, index) => {
          const isActive = index <= currentStage;
          const isCurrent = index === currentStage && !stage.completed;
          
          return (
            <View key={stage.id} style={styles.stageContainer}>
              <View style={styles.stageContent}>
                <View
                  style={[
                    styles.stageIcon,
                    {
                      backgroundColor: isActive ? stage.color + '20' : '#E0E0E020',
                      borderColor: isActive ? stage.color : '#E0E0E0',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={stage.icon as any}
                    size={20}
                    color={isActive ? stage.color : '#999'}
                  />
                </View>
                <ThemedText
                  style={[
                    styles.stageLabel,
                    { color: isActive ? '#333' : '#999' },
                  ]}
                >
                  {stage.label}
                </ThemedText>
                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <ThemedText style={styles.currentText}>Current</ThemedText>
                  </View>
                )}
              </View>
              {index < stages.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    {
                      backgroundColor: index < currentStage ? stage.color : '#E0E0E0',
                    },
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.statusInfo}>
        <ThemedText style={styles.statusText}>
          Status: <ThemedText style={styles.statusValue}>{approvalStatus || 'Pending'}</ThemedText>
        </ThemedText>
        {hospitalApprovedAt && (
          <ThemedText style={styles.timestamp}>
            Hospital approved: {new Date(hospitalApprovedAt).toLocaleDateString('en-IN')}
          </ThemedText>
        )}
        {adminApprovedAt && (
          <ThemedText style={styles.timestamp}>
            Admin approved: {new Date(adminApprovedAt).toLocaleDateString('en-IN')}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  hospitalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hospitalName: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 4,
  },
  amountContainer: {
    marginBottom: 20,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  timeline: {
    marginBottom: 16,
  },
  stageContainer: {
    marginBottom: 8,
  },
  stageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginRight: 12,
  },
  stageLabel: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  currentBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  currentText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: '600',
  },
  connector: {
    width: 2,
    height: 20,
    marginLeft: 20,
    marginTop: 4,
    marginBottom: 4,
  },
  statusInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statusText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontWeight: '600',
    color: '#333',
    textTransform: 'capitalize',
  },
  timestamp: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
});

