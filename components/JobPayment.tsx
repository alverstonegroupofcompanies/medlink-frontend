import React, { useState } from 'react';
import { View, StyleSheet, Alert, Modal, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import API from '@/app/api';

interface JobPaymentProps {
  jobRequirementId: number;
  amount: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export const JobPayment: React.FC<JobPaymentProps> = ({ 
  jobRequirementId, 
  amount, 
  onSuccess,
  onCancel 
}) => {
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Create payment order
      const { data } = await API.post('/payments/create-order', {
        job_requirement_id: jobRequirementId,
        amount: amount
      });

      // For now, automatically mark as paid (testing mode)
      // In production, this would integrate with Razorpay
      await API.post(`/payments/${data.payment_id}/mark-paid`);

      Alert.alert(
        'Payment Secured',
        'Your payment is now held in Escrow. Funds will only be transferred to the doctor after you review and approve their work.',
        [{ text: 'OK', onPress: onSuccess }]
      );
      
      setShowConfirmation(false);
      
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert(
        'Payment Failed',
        error.response?.data?.error || 'Failed to process payment. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ThemedButton
        title={`Pay ₹${amount.toFixed(2)}`}
        onPress={() => setShowConfirmation(true)}
        style={styles.payButton}
      >
        <View style={styles.buttonContent}>
          <MaterialIcons name="payment" size={20} color="#FFFFFF" />
          <ThemedText style={styles.buttonText}>Pay ₹{amount.toFixed(2)}</ThemedText>
        </View>
      </ThemedButton>

      {/* Payment Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#2563EB', '#3B82F6']}
              style={styles.modalHeader}
            >
              <MaterialIcons name="payment" size={48} color="#FFFFFF" />
              <ThemedText style={styles.modalTitle}>Confirm Payment</ThemedText>
            </LinearGradient>

            <View style={styles.modalBody}>
              <View style={styles.amountRow}>
                <ThemedText style={styles.amountLabel}>Total Amount:</ThemedText>
                <ThemedText style={styles.amountValue}>₹{amount.toFixed(2)}</ThemedText>
              </View>

              <View style={styles.infoBox}>
                <MaterialIcons name="info-outline" size={20} color="#2563EB" />
                <ThemedText style={styles.infoText}>
                  Payment will be held securely and released to the doctor after job completion and your approval (+ 30 minutes).
                </ThemedText>
              </View>

              <View style={styles.breakdownBox}>
                <ThemedText style={styles.breakdownTitle}>Payment Breakdown</ThemedText>
                <View style={styles.breakdownRow}>
                  <ThemedText style={styles.breakdownLabel}>Doctor Payment:</ThemedText>
                  <ThemedText style={styles.breakdownValue}>
                    ₹{(amount * 0.8).toFixed(2)}
                  </ThemedText>
                </View>
                <View style={styles.breakdownRow}>
                  <ThemedText style={styles.breakdownLabel}>Platform Fee (20%):</ThemedText>
                  <ThemedText style={styles.breakdownValue}>
                    ₹{(amount * 0.2).toFixed(2)}
                  </ThemedText>
                </View>
                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <ThemedText style={styles.totalLabel}>Total:</ThemedText>
                  <ThemedText style={styles.totalValue}>₹{amount.toFixed(2)}</ThemedText>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowConfirmation(false);
                    onCancel?.();
                  }}
                >
                  <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                </TouchableOpacity>

                <ThemedButton
                  title="Confirm Payment"
                  onPress={handlePayment}
                  loading={loading}
                  style={styles.confirmButton}
                >
                  <ThemedText style={styles.confirmButtonText}>
                    {loading ? 'Processing...' : 'Confirm Payment'}
                  </ThemedText>
                </ThemedButton>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  payButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 56,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    padding: 32,
    alignItems: 'center',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  modalBody: {
    padding: 24,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2563EB',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 20,
  },
  breakdownBox: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 56,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
