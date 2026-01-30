import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../api';
import { DoctorPrimaryColors as DoctorColors } from '@/constants/doctor-theme';
import { HospitalPrimaryColors as HospitalColors } from '@/constants/hospital-theme';
import { ErrorModal } from '@/components/ErrorModal';
import { SuccessModal } from '@/components/SuccessModal';

export default function ForgotPasswordOtpScreen() {
  const { email = '', type = 'doctor' } = useLocalSearchParams<{ email?: string; type?: string }>();
  const isHospital = type === 'hospital';
  const Primary = isHospital ? HospitalColors : DoctorColors;

  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      const pasted = value.slice(0, 6).split('');
      pasted.forEach((d, i) => {
        inputRefs.current[i]?.setNativeProps({ text: d });
      });
      setOtp(pasted.join(''));
      inputRefs.current[5]?.focus();
      if (pasted.length === 6) goToReset(pasted.join(''));
      return;
    }
    const arr = otp.split('');
    arr[index] = value;
    const next = arr.join('');
    setOtp(next);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
    if (next.length === 6) goToReset(next);
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  const goToReset = (code: string) => {
    router.push({
      pathname: '/forgot-password/reset',
      params: { email, type, otp: code },
    });
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const endpoint = isHospital ? '/hospital/forgot-password' : '/doctor/forgot-password';
      const res = await API.post(endpoint, { email });
      if (res.data?.status) {
        setShowSuccessModal(true);
        setOtp('');
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.data?.message || 'Failed to resend.');
        setShowErrorModal(true);
      }
    } catch {
      setErrorMessage('Failed to resend. Please try again.');
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
        title="Code Sent"
        message="New verification code sent. Please enter it manually."
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kv}>
          <View style={styles.card}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <ArrowLeft size={20} color="#64748B" />
            </TouchableOpacity>

            <View style={styles.headerIconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: `${Primary.main}15` }]}>
                <Mail size={24} color={Primary.main} />
              </View>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>AlverConnect</Text>
                <Text style={styles.headerTagline}>Enter Verification Code</Text>
              </View>
            </View>

            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.hint}>Code expires in 10 minutes. Enter it manually—do not paste from SMS.</Text>

            <View style={styles.otpRow}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputRefs.current[i] = r)}
                  style={[styles.otpInput, otp[i] && styles.otpFilled]}
                  value={otp[i] || ''}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  autoComplete="off"
                  textContentType="none"
                />
              ))}
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => goToReset(otp)}
              disabled={otp.length !== 6}
            >
              <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.submitButtonGradient, otp.length !== 6 && styles.submitButtonDisabled]}
              >
                <Text style={styles.submitButtonText}>Continue</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resend} onPress={handleResend} disabled={resending}>
              {resending ? (
                <ActivityIndicator size="small" color={Primary.main} />
              ) : (
                <Text style={styles.resendText}>Didn't receive code? <Text style={styles.resendBold}>Resend</Text></Text>
              )}
            </TouchableOpacity>
          </View>
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
  kv: {
    flex: 1,
    width: '100%',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 32,
    padding: 28,
    margin: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 20,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  backBtn: {
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
    marginBottom: 24,
    gap: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  emailText: {
    fontWeight: '600',
    color: '#1E293B',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 16,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    flex: 1,
    height: 56,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  otpFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  submitButton: {
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    overflow: 'hidden',
  },
  submitButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 16,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  resend: {
    alignItems: 'center',
    marginTop: 20,
  },
  resendText: {
    fontSize: 14,
    color: '#64748B',
  },
  resendBold: {
    color: '#2563EB',
    fontWeight: '600',
  },
});
