import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import API from '../../api';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';

export default function HospitalOtpScreen() {
  const params = useLocalSearchParams();
  const email = (params.email as string) || '';

  const [otp, setOtp] = useState(''); // Do not auto-fill from params or SMS
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const pastedOtp = value.slice(0, 6);
      const newOtp = pastedOtp.split('');
      newOtp.forEach((digit, i) => {
        if (inputRefs.current[i]) {
          inputRefs.current[i]?.setNativeProps({ text: digit });
        }
      });
      setOtp(pastedOtp);
      inputRefs.current[5]?.focus();
      return;
    }

    const newOtp = otp.split('');
    newOtp[index] = value;
    const updatedOtp = newOtp.join('');

    setOtp(updatedOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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
      Alert.alert('Error', 'Please enter the complete 6-digit code');
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
        Alert.alert('Error', response.data.message || 'Invalid OTP');
        setOtp('');
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Invalid OTP. Please try again.');
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
        Alert.alert('Success', 'New OTP sent to your email. Please enter the code manually.');
        setOtp(''); // Do not auto-fill: user must type the code
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verify Email</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.iconContainer}>
              <Mail size={56} color={PrimaryColors.main} />
            </View>

            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.hint}>Code expires in 10 minutes. Enter it manually—do not paste from SMS.</Text>

            <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={[styles.otpInput, otp[index] && styles.otpInputFilled]}
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

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => handleVerifyOtp()}
            disabled={loading || otp.length !== 6}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>

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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: '#1e293b',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    backgroundColor: '#fff',
  },
  otpInputFilled: {
    borderColor: PrimaryColors.main,
    backgroundColor: '#f0fdf4',
  },
  button: {
    backgroundColor: PrimaryColors.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#64748b',
  },
  resendBold: {
    color: PrimaryColors.main,
    fontWeight: '600',
  },
});
