import React, { useState } from 'react';
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
import { ArrowLeft, Lock } from 'lucide-react-native';
import API from '../api';
import { validatePassword, PASSWORD_RULES_TEXT } from '@/utils/passwordValidation';
import { DoctorPrimaryColors as DoctorColors } from '@/constants/doctor-theme';
import { HospitalPrimaryColors as HospitalColors } from '@/constants/hospital-theme';

export default function ForgotPasswordResetScreen() {
  const { email = '', type = 'doctor', otp = '' } = useLocalSearchParams<{ email?: string; type?: string; otp?: string }>();
  const isHospital = type === 'hospital';
  const Primary = isHospital ? HospitalColors : DoctorColors;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      Alert.alert('Validation Error', pwCheck.message);
      return;
    }
    if (password !== confirm) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return;
    }
    if (!email || !otp) {
      Alert.alert('Error', 'Session expired. Please start from Forgot Password again.');
      router.replace(`/forgot-password?type=${type}`);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isHospital ? '/hospital/reset-password' : '/doctor/reset-password';
      const res = await API.post(endpoint, {
        email,
        otp,
        password,
        password_confirmation: confirm,
      });
      if (res.data?.status) {
        Alert.alert('Success', 'Password reset successfully. You can now login.', [
          { text: 'OK', onPress: () => router.replace(isHospital ? '/hospital/login' : '/login') },
        ]);
      } else {
        Alert.alert('Error', res.data?.message || 'Reset failed');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kv}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New password</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: Primary.lightest }]}>
            <Lock size={48} color={Primary.main} />
          </View>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>{PASSWORD_RULES_TEXT}</Text>

          <Text style={styles.label}>New password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter new password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Confirm password</Text>
          <TextInput
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            autoCapitalize="none"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: Primary.main }, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading || !password || !confirm}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset password</Text>}
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
  subtitle: { fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 16,
  },
  btn: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
