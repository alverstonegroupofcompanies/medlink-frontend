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
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail } from 'lucide-react-native';
import API from '../api';
import { DoctorPrimaryColors as DoctorColors } from '@/constants/doctor-theme';
import { HospitalPrimaryColors as HospitalColors } from '@/constants/hospital-theme';

export default function ForgotPasswordOtpScreen() {
  const { email = '', type = 'doctor' } = useLocalSearchParams<{ email?: string; type?: string }>();
  const isHospital = type === 'hospital';
  const Primary = isHospital ? HospitalColors : DoctorColors;

  const [otp, setOtp] = useState('');
  const [resending, setResending] = useState(false);
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
        Alert.alert('Success', 'New code sent. Please enter it manually.');
        setOtp('');
        inputRefs.current[0]?.focus();
      } else Alert.alert('Error', res.data?.message || 'Failed to resend.');
    } catch {
      Alert.alert('Error', 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kv}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enter code</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: Primary.lightest }]}>
            <Mail size={48} color={Primary.main} />
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
            style={[styles.btn, { backgroundColor: Primary.main }, otp.length !== 6 && styles.btnDisabled]}
            onPress={() => goToReset(otp)}
            disabled={otp.length !== 6}
          >
            <Text style={styles.btnText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resend} onPress={handleResend} disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color={Primary.main} />
            ) : (
              <Text style={styles.resendText}>Didn’t receive code? <Text style={styles.resendBold}>Resend</Text></Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  kv: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  card: {
    margin: 20,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1e293b', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  emailText: { fontWeight: '600', color: '#1e293b' },
  hint: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 16 },
  otpRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 24 },
  otpInput: {
    flex: 1,
    height: 52,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  otpFilled: { borderColor: '#2563EB', backgroundColor: '#eff6ff' },
  btn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  resend: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: '#64748b' },
  resendBold: { color: '#2563EB', fontWeight: '600' },
});
