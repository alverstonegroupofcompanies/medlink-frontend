import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { X } from 'lucide-react-native';
import API from '../app/api';

interface RazorpayPaymentWidgetProps {
  visible: boolean;
  onClose: () => void;
  amount: number;
  jobData: any;
  onSuccess: (jobRequirement: any) => void;
  onFailure: (error: string) => void;
}

export const RazorpayPaymentWidget: React.FC<RazorpayPaymentWidgetProps> = ({
  visible,
  onClose,
  amount,
  jobData,
  onSuccess,
  onFailure,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'summary' | 'processing' | 'checkout'>('summary');
  const [razorpayHtml, setRazorpayHtml] = useState('');
  const webViewRef = useRef<WebView>(null);

  const adminCommission = 20; // 20%
  const adminAmount = (amount * adminCommission) / 100;
  const doctorAmount = amount - adminAmount;

  const handleProceedToPayment = async () => {
    try {
      setLoading(true);
      setPaymentStep('processing');

      // Step 1: Create Razorpay order
      const orderResponse = await API.post('/hospital/payments/create-razorpay-order', {
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

      // Step 2: Generate HTML for Razorpay checkout
      const html = generateRazorpayHTML({
        key: razorpay_key_id,
        amount: amount * 100, // Convert to paise
        currency: 'INR',
        name: name || 'MedLink',
        description: description || 'Job Posting Payment',
        order_id: razorpay_order_id,
        prefill: prefill || {},
        payment_id,
      });

      setRazorpayHtml(html);
      setPaymentStep('checkout');
      setLoading(false);
    } catch (error: any) {
      console.error('Payment error:', error);
      setLoading(false);
      setPaymentStep('summary');
      onFailure(error.response?.data?.message || error.message || 'Failed to initiate payment');
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'payment_success') {
        setLoading(true);
        setPaymentStep('processing');

        // Verify payment on backend
        const verifyResponse = await API.post('/hospital/payments/verify-payment', {
          payment_id: data.payment_id,
          razorpay_payment_id: data.razorpay_payment_id,
          razorpay_order_id: data.razorpay_order_id,
          razorpay_signature: data.razorpay_signature,
        });

        if (verifyResponse.data.success) {
          onSuccess(verifyResponse.data.job_requirement);
        } else {
          throw new Error('Payment verification failed');
        }
      } else if (data.type === 'payment_failed') {
        onFailure(data.error || 'Payment failed');
      } else if (data.type === 'payment_cancelled') {
        setPaymentStep('summary');
        Alert.alert('Payment Cancelled', 'You cancelled the payment');
      }
    } catch (error: any) {
      console.error('Payment verification error:', error);
      onFailure(error.response?.data?.message || 'Payment verification failed');
    } finally {
      setLoading(false);
    }
  };

  const generateRazorpayHTML = (options: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .container {
      text-align: center;
      background: white;
      padding: 30px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2563EB;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .message {
      color: #666;
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="loader"></div>
    <div class="message">Opening Razorpay Checkout...</div>
  </div>
  
  <script>
    var options = {
      key: "${options.key}",
      amount: ${options.amount},
      currency: "${options.currency}",
      name: "${options.name}",
      description: "${options.description}",
      order_id: "${options.order_id}",
      prefill: ${JSON.stringify(options.prefill)},
      theme: {
        color: "#2563EB"
      },
      modal: {
        ondismiss: function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'payment_cancelled'
          }));
        }
      },
      handler: function(response) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'payment_success',
          payment_id: "${options.payment_id}",
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_order_id: response.razorpay_order_id,
          razorpay_signature: response.razorpay_signature
        }));
      }
    };

    var rzp = new Razorpay(options);
    
    rzp.on('payment.failed', function(response) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'payment_failed',
        error: response.error.description
      }));
    });

    // Auto-open checkout
    setTimeout(function() {
      rzp.open();
    }, 500);
  </script>
</body>
</html>
    `;
  };

  const handleClose = () => {
    if (paymentStep === 'checkout') {
      Alert.alert(
        'Cancel Payment?',
        'Are you sure you want to cancel the payment?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            onPress: () => {
              setPaymentStep('summary');
              setRazorpayHtml('');
              onClose();
            },
          },
        ]
      );
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {paymentStep === 'summary' ? 'Payment Summary' : 'Complete Payment'}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {paymentStep === 'summary' && (
          <View style={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Job Posting Payment</Text>
              
              <View style={styles.amountRow}>
                <Text style={styles.label}>Total Amount:</Text>
                <Text style={styles.totalAmount}>₹{amount}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Admin Commission (20%):</Text>
                <Text style={styles.breakdownValue}>₹{adminAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Doctor's Amount (80%):</Text>
                <Text style={styles.breakdownValue}>₹{doctorAmount.toFixed(2)}</Text>
              </View>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  The doctor's amount will be held in escrow until job approval + 30 minutes delay.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.payButton, loading && styles.payButtonDisabled]}
              onPress={handleProceedToPayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payButtonText}>Proceed to Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {paymentStep === 'processing' && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Processing payment...</Text>
          </View>
        )}

        {paymentStep === 'checkout' && razorpayHtml && (
          <WebView
            ref={webViewRef}
            source={{ html: razorpayHtml }}
            style={styles.webview}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={styles.loadingText}>Loading checkout...</Text>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  summaryCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#4B5563',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
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
  payButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  webview: {
    flex: 1,
  },
});
