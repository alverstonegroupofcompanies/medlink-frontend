import React, { useState } from 'react';
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
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, User } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import API from '../../api';
import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';
import { ErrorModal } from '@/components/ErrorModal';

export default function DoctorEmailScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendOtp = async () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      setShowErrorModal(true);
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setErrorMessage('Please enter a valid email address');
      setShowErrorModal(true);
      return;
    }

    setLoading(true);
    try {
      const response = await API.post('/doctor/registration/send-otp', {
        email: email.trim(),
      });

      if (response.data.status) {
        // Store email for next step
        const registrationData = {
          email: email.trim(),
          step: 'otp',
        };
        await require('@react-native-async-storage/async-storage').default.setItem(
          'doctorRegistrationData',
          JSON.stringify(registrationData)
        );

        router.push({
          pathname: '/register/doctor/step2-otp',
          params: { email: email.trim(), otp: response.data.otp || '' },
        });
      } else {
        setErrorMessage(response.data.message || 'Failed to send verification code');
        setShowErrorModal(true);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Send OTP error:', error);
      }
      setErrorMessage(
        error.response?.data?.message || 'Failed to send verification code. Please try again.'
      );
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
                  <User size={24} color="#2563EB" />
                </View>
                <View style={styles.headerTitleContainer}>
                  <Text style={styles.headerTitle}>AlverConnect</Text>
                  <Text style={styles.headerTagline}>Doctor Registration</Text>
                </View>
              </View>

              {/* Welcome Text */}
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeHeading}>Verify Your Email</Text>
                <Text style={styles.welcomeSubheading}>
                  We'll send a verification code to confirm your email address
                </Text>
              </View>

              {/* Input */}
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Send Code Button */}
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSendOtp}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendButtonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.sendButtonText}>Send Verification Code</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginPrompt}>
                <Text style={styles.loginPromptText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
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
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
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
  formContainer: {
    marginBottom: 28,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    paddingVertical: 14,
    fontWeight: '500',
  },
  sendButton: {
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sendButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 16,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loginPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  loginPromptText: {
    fontSize: 15,
    color: '#64748B',
  },
  loginLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
});
