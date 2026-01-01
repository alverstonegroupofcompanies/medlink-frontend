import React, { useState } from 'react';
import { View, Modal, StyleSheet, Alert, ActivityIndicator, Linking } from 'react-native';
import { Button, Text, Surface } from 'react-native-paper';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import * as WebBrowser from 'expo-web-browser';
import API from '../app/api';

interface RazorpayPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  jobData: any;
  onSuccess: (jobRequirement: any) => void;
  onFailure: (error: string) => void;
}

export function RazorpayPaymentModal({
  visible,
  onClose,
  amount,
  jobData,
  onSuccess,
  onFailure,
}: RazorpayPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'summary' | 'processing' | 'verifying'>('summary');

  const adminCommission = 20; // 20%
  const adminAmount = amount * (adminCommission / 100);
  const doctorAmount = amount - adminAmount;

  const handlePayment = async () => {
    try {
      setLoading(true);
      setPaymentStep('processing');

      // Step 1: Create Razorpay order
      const orderResponse = await API.post('/payments/create-razorpay-order', {
        amount,
        job_data: jobData,
      });

      if (!orderResponse.data.success) {
        throw new Error(orderResponse.data.error || 'Failed to create payment order');
      }

      const {
        payment_id,
        razorpay_order_id,
        razorpay_key_id,
        name,
        description,
        prefill,
      } = orderResponse.data;

      // Step 2: Open Razorpay checkout in browser
      const razorpayUrl = createRazorpayCheckoutUrl({
        key: razorpay_key_id,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name,
        description,
        order_id: razorpay_order_id,
        prefill,
      });

      const result = await WebBrowser.openBrowserAsync(razorpayUrl);

      // Note: In a real implementation, you would need to handle the callback
      // For now, we'll prompt the user to confirm payment
      if (result.type === 'cancel') {
        throw new Error('Payment cancelled by user');
      }

      // Step 3: Verify payment (in production, this would be triggered by callback)
      setPaymentStep('verifying');
      
      // For demo purposes, show a prompt to enter payment details
      // In production, this would be handled via deep linking or webhook
      Alert.alert(
        'Payment Verification',
        'After completing payment in the browser, please return here and click "Verify Payment"',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setLoading(false);
              setPaymentStep('summary');
              onFailure('Payment cancelled');
            },
          },
          {
            text: 'Verify Payment',
            onPress: () => handlePaymentVerification(payment_id, razorpay_order_id),
          },
        ]
      );

    } catch (error: any) {
      console.error('Payment error:', error);
      setLoading(false);
      setPaymentStep('summary');
      onFailure(error.message || 'Payment failed');
      Alert.alert('Payment Failed', error.message || 'An error occurred during payment');
    }
  };

  const handlePaymentVerification = async (paymentId: string, orderId: string) => {
    try {
      // In production, you would get these from the callback URL
      // For demo, we'll need to prompt the user or use a different approach
      
      // This is a simplified version - in production, you'd use deep linking
      // to capture the payment_id and signature from Razorpay's callback
      
      Alert.alert(
        'Demo Mode',
        'In production, payment verification would happen automatically via callback. For now, please contact support to complete your job posting.',
        [
          {
            text: 'OK',
            onPress: () => {
              setLoading(false);
              onClose();
            },
          },
        ]
      );

    } catch (error: any) {
      console.error('Verification error:', error);
      setLoading(false);
      setPaymentStep('summary');
      onFailure(error.message || 'Payment verification failed');
      Alert.alert('Verification Failed', error.message || 'Failed to verify payment');
    }
  };

  const createRazorpayCheckoutUrl = (options: any) => {
    // Create a URL that opens Razorpay's hosted checkout page
    const params = new URLSearchParams({
      key_id: options.key,
      amount: options.amount.toString(),
      currency: options.currency,
      name: options.name,
      description: options.description,
      order_id: options.order_id,
      'prefill[name]': options.prefill.name || '',
      'prefill[email]': options.prefill.email || '',
      'prefill[contact]': options.prefill.contact || '',
    });

    // Razorpay's standard checkout URL
    return `https://api.razorpay.com/v1/checkout/embedded?${params.toString()}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Surface style={styles.modalContent}>
          {paymentStep === 'summary' && (
            <>
              <Text style={styles.modalTitle}>Payment Summary</Text>
              
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount:</Text>
                  <Text style={styles.summaryValue}>₹{amount.toFixed(2)}</Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelSecondary}>Admin Commission (20%):</Text>
                  <Text style={styles.summaryValueSecondary}>₹{adminAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabelSecondary}>Doctor's Amount (80%):</Text>
                  <Text style={styles.summaryValueSecondary}>₹{doctorAmount.toFixed(2)}</Text>
                </View>

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    💡 The doctor's amount will be held in escrow and released 30 minutes after job approval.
                  </Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <Button
                  mode="outlined"
                  onPress={onClose}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handlePayment}
                  style={styles.payButton}
                  loading={loading}
                  disabled={loading}
                  buttonColor={PrimaryColors.main}
                >
                  Proceed to Payment
                </Button>
              </View>
            </>
          )}

          {(paymentStep === 'processing' || paymentStep === 'verifying') && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={PrimaryColors.main} />
              <Text style={styles.loadingText}>
                {paymentStep === 'processing' ? 'Opening payment gateway...' : 'Verifying payment...'}
              </Text>
            </View>
          )}
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  summaryLabelSecondary: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryValueSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  payButton: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
