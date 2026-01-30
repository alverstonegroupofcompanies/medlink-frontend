import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Shield } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { ErrorModal } from '@/components/ErrorModal';
import { SuccessModal } from '@/components/SuccessModal';

export default function HospitalOtpScreen() {
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    // Handle paste
    if (value.length > 1) {
      const pastedOtp = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = pastedOtp.split('');
      newOtp.forEach((digit, i) => {
        if (inputRefs.current[i]) {
          inputRefs.current[i]?.setNativeProps({ text: digit });
        }
      });
      setOtp(pastedOtp);
      if (pastedOtp.length === 6) {
        inputRefs.current[5]?.focus();
        handleVerifyOtp(pastedOtp);
      } else {
        inputRefs.current[Math.min(pastedOtp.length, 5)]?.focus();
      }
      return;
    }

    // Handle single digit input
    const newOtp = otp.split('');
    if (value) {
      newOtp[index] = value.replace(/\D/g, '');
    } else {
      newOtp[index] = '';
    }
    const updatedOtp = newOtp.join('');

    setOtp(updatedOtp);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (updatedOtp.length === 6) {
      handleVerifyOtp(updatedOtp);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (otpToVerify?: string) => {
    const otpValue = otpToVerify || otp;
    if (otpValue.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/hospital/registration/verify-otp', {
        email,
        otp: otpValue,
      });

      if (response.data.status) {
        const registrationData = {
          email,
          otp: otpValue,
          step: 'details',
        };
        await require('@react-native-async-storage/async-storage').default.setItem(
          'hospitalRegistrationData',
          JSON.stringify(registrationData)
        );

        router.push('/register/hospital/step3-details');
      } else {
        setErrorMessage(response.data.message || 'Invalid verification code');
        setShowErrorModal(true);
        setOtp('');
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Verify OTP error:', error);
      }
      setErrorMessage(error.response?.data?.message || 'Invalid verification code. Please try again.');
      setShowErrorModal(true);
      setOtp('');
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      const response = await API.post('/hospital/registration/send-otp', { email });
      if (response.data.status) {
        setSuccessMessage('New verification code sent to your email');
        setShowSuccessModal(true);
        setOtp('');
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(response.data.message || 'Failed to resend code');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      setErrorMessage('Failed to resend code. Please try again.');
      setShowErrorModal(true);
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <ErrorModal
        visible={showErrorModal}
        title="Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <SuccessModal
        visible={showSuccessModal}
        title="Success"
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      
      {/* Full-screen background */}
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.fullBackgroundImage}
        resizeMode="cover"
      />
      
      {/* Overlay */}
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.card}>
              {/* Back Button */}
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Header Icon */}
              <View style={styles.headerIconContainer}>
                <View style={styles.iconCircle}>
                  <Shield size={24} color="#2563EB" />
                </View>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>AlverConnect</Text>
                  <Text style={styles.headerTagline}>Verify Your Email</Text>
                </View>
              </View>

              {/* Welcome Text */}
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeHeading}>Enter Verification Code</Text>
                <Text style={styles.welcomeSubheading}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.emailText}>{email}</Text>
                </Text>
              </View>

              {/* OTP Inputs */}
              <View style={styles.otpContainer}>
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (inputRefs.current[index] = ref)}
                    style={[
                      styles.otpInput,
                      otp[index] && styles.otpInputFilled,
                      index === otp.length && styles.otpInputActive,
                    ]}
                    value={otp[index] || ''}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                    editable={!loading}
                    autoComplete="off"
                    textContentType="none"
                  />
                ))}
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                style={styles.verifyButton}
                onPress={() => handleVerifyOtp()}
                disabled={loading || otp.length !== 6}
              >
                <LinearGradient
                  colors={otp.length === 6 ? ['#2563EB', '#3B82F6'] : ['#94A3B8', '#94A3B8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.verifyButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Resend */}
              <TouchableOpacity
                style={styles.resendButton}
                onPress={handleResendOtp}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator size="small" color={PrimaryColors.main} />
                ) : (
                  <Text style={styles.resendText}>
                    Didn't receive code? <Text style={styles.resendBold}>Resend</Text>
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e40af',
  },
  fullBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(30, 64, 175, 0.7)',
    zIndex: 1,
  },
  safeArea: {
    flex: 1,
    zIndex: 2,
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 40,
    paddingTop: 40,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.15)',
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    letterSpacing: 0.5,
  },
  headerTagline: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  welcomeContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  welcomeSubheading: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: '#1E293B',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 10,
  },
  otpInput: {
    flex: 1,
    height: 64,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  otpInputFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  otpInputActive: {
    borderColor: '#2563EB',
    backgroundColor: '#FFFFFF',
  },
  verifyButton: {
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  verifyButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 16,
  },
  verifyButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 15,
    color: '#64748B',
  },
  resendBold: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
