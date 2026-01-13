import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, TextInput } from 'react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const colorScheme = useColorScheme();
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const email = params.emailId as string;
  const fullName = params.fullName as string;
  const phoneNumber = params.phoneNumber as string;
  const password = params.password as string;
  const profilePhoto = params.profilePhoto as string;

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'Email address is missing. Please go back and try again.');
    }
    
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer, email]);

  const handleOtpChange = (value: string, index: number) => {
    if (value.length > 1) {
      // Handle paste
      const pastedOtp = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedOtp.forEach((char, i) => {
        if (index + i < 6) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus last input
      if (index + pastedOtp.length < 6) {
        inputRefs.current[index + pastedOtp.length]?.focus();
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/verify-otp`, {
        email,
        otp: otpString,
        type: 'doctor',
      });

      if (response.data.status) {
        // OTP verified, save data to storage and proceed
        const registrationData = {
          fullName,
          phoneNumber,
          emailId: email,
          password,
          profilePhoto: profilePhoto ? (profilePhoto.length > 50000 ? '' : profilePhoto) : '',
          otp: otpString,
        };
        
        await AsyncStorage.setItem('doctorRegistrationData', JSON.stringify(registrationData));

        router.push({
          pathname: '/signup/professional-details',
          params: { mode: 'registration' } // Minimal param to signal source
        });
      } else {
        Alert.alert('Error', response.data.message || 'Invalid OTP');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to verify OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setResendLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/send-otp`, {
        email,
        type: 'doctor',
      });

      if (response.data.status) {
        Alert.alert('Success', 'OTP sent successfully to your email');
        setTimer(60);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', response.data.message || 'Failed to resend OTP');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to resend OTP. Please try again.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#60a5fa']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              <ThemedText style={styles.backText}>Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.signUpText}>Verify Email</ThemedText>
          </View>

          {/* White Form Card */}
          <View style={styles.formCard}>
            <ThemedText style={styles.registerText}>Email Verification</ThemedText>
            <ThemedText style={styles.heading}>Enter OTP</ThemedText>
            <ThemedText style={styles.subheading}>
              We've sent a 6-digit verification code to{'\n'}
              <ThemedText style={styles.emailText}>{email}</ThemedText>
            </ThemedText>

            {/* OTP Input Boxes */}
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref: TextInput | null) => {
                    inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    {
                      borderColor: digit
                        ? '#2563EB'
                        : '#E2E8F0',
                      backgroundColor: '#F8FAFC',
                    },
                  ]}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(value, index)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>

            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <ThemedText style={styles.resendText}>
                Didn't receive the code?{' '}
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={resendLoading}>
                    <ThemedText style={styles.resendLink}>
                      {resendLoading ? 'Sending...' : 'Resend OTP'}
                    </ThemedText>
                  </TouchableOpacity>
                ) : (
                  <ThemedText style={styles.timerText}>
                    Resend in {timer}s
                  </ThemedText>
                )}
              </ThemedText>
            </View>

            <ThemedButton
              title="Verify & Continue"
              onPress={handleVerify}
              loading={loading}
              style={styles.verifyButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#3b82f6',
  },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    padding: 24,
    paddingTop: 12,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 32,
    paddingHorizontal: 8,
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 20,
    paddingVertical: 8,
  },
  backText: { 
    fontSize: 16, 
    marginLeft: 8, 
    color: '#FFFFFF',
    fontWeight: '600',
  },
  signUpText: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 4,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 28,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  registerText: { 
    fontSize: 15, 
    color: '#64748B', 
    marginBottom: 8,
    fontWeight: '500', 
  },
  heading: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 8,
    color: '#1E3A8A',
  },
  subheading: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emailText: { 
    fontWeight: '700', 
    color: '#2563EB',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpInput: {
    width: 48,
    height: 60,
    borderWidth: 1.5,
    borderRadius: 16,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#64748B',
  },
  resendLink: {
    color: '#2563EB',
    fontWeight: '700',
  },
  timerText: {
    color: '#94A3B8',
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 56,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

