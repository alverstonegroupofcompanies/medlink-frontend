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
  StatusBar,
  Image,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../api';
import { validatePassword } from '@/utils/passwordValidation';
import { DoctorPrimaryColors as DoctorColors } from '@/constants/doctor-theme';
import { HospitalPrimaryColors as HospitalColors } from '@/constants/hospital-theme';
import { PasswordRulesInline } from '@/components/PasswordRulesInline';
import { ErrorModal } from '@/components/ErrorModal';
import { SuccessModal } from '@/components/SuccessModal';

export default function ForgotPasswordResetScreen() {
  const { email = '', type = 'doctor', otp = '' } = useLocalSearchParams<{ email?: string; type?: string; otp?: string }>();
  const isHospital = type === 'hospital';
  const Primary = isHospital ? HospitalColors : DoctorColors;

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmFocused, setIsConfirmFocused] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleReset = async () => {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      setErrorMessage(pwCheck.message || 'Password does not meet requirements');
      setShowErrorModal(true);
      return;
    }
    if (password !== confirm) {
      setErrorMessage('Passwords do not match');
      setShowErrorModal(true);
      return;
    }
    if (!email || !otp) {
      setErrorMessage('Session expired. Please start from Forgot Password again.');
      setShowErrorModal(true);
      setTimeout(() => {
        router.replace(`/forgot-password?type=${type}`);
      }, 2000);
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
        setShowSuccessModal(true);
        setTimeout(() => {
          router.replace('/login');
        }, 2000);
      } else {
        setErrorMessage(res.data?.message || 'Reset failed');
        setShowErrorModal(true);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to reset password. Please try again.');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
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
        message="Password reset successfully. You can now login."
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
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.card}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <ArrowLeft size={20} color="#64748B" />
              </TouchableOpacity>

              <View style={styles.headerIconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: `${Primary.main}15` }]}>
                  <Lock size={24} color={Primary.main} />
                </View>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>AlverConnect</Text>
                  <Text style={styles.headerTagline}>Create New Password</Text>
                </View>
              </View>

              <Text style={styles.title}>Create a new password</Text>
              <Text style={styles.subtitle}>
                Your password must meet the requirements below
              </Text>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>New Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter new password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
                {(isPasswordFocused || !!password) && (
                  <PasswordRulesInline password={password} />
                )}
              </View>

              <View style={styles.inputWrapper}>
                <Text style={styles.label}>Confirm Password *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirm}
                    onChangeText={setConfirm}
                    placeholder="Re-enter password"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    editable={!loading}
                    onFocus={() => setIsConfirmFocused(true)}
                    onBlur={() => setIsConfirmFocused(false)}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    activeOpacity={0.7}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
                {isConfirmFocused && confirm && password !== confirm && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
                {isConfirmFocused && confirm && password === confirm && (
                  <View style={styles.matchIndicator}>
                    <CheckCircle size={16} color="#16A34A" />
                    <Text style={styles.matchText}>Passwords match</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleReset}
                disabled={loading || !password || !confirm || password !== confirm}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.submitButtonGradient, (loading || !password || !confirm || password !== confirm) && styles.submitButtonDisabled]}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Reset Password</Text>
                  )}
                </LinearGradient>
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
  kv: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
    paddingBottom: 40,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 8,
    marginLeft: 4,
  },
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginLeft: 4,
  },
  matchText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
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
});
