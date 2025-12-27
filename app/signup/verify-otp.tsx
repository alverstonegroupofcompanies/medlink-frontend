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
  }, [timer]);

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
        // OTP verified, proceed to professional details
        router.push({
          pathname: '/signup/professional-details',
          params: {
            fullName,
            phoneNumber,
            emailId: email,
            password,
            profilePhoto: profilePhoto ? (profilePhoto.length > 50000 ? '' : profilePhoto) : '', // Safeguard against large URIs/base64
            otp: otpString, // Include OTP for registration
          },
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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Curved Header */}
          <LinearGradient colors={[PrimaryColors.lighter, NeutralColors.background]} style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#11181C" />
              <ThemedText style={styles.backText}>Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.signUpText}>Verify Email</ThemedText>
          </LinearGradient>

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
                        ? PrimaryColors.main
                        : colorScheme === 'dark'
                        ? '#374151'
                        : '#e5e7eb',
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeutralColors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: {
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    paddingTop: 70,
    paddingBottom: 60,
    paddingHorizontal: 30,
  },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 16, marginLeft: 8, color: '#11181C' },
  signUpText: { fontSize: 32, fontWeight: '700', color: '#000' },
  formCard: {
    backgroundColor: NeutralColors.cardBackground,
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 25,
    paddingVertical: 30,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  registerText: { fontSize: 14, color: NeutralColors.textSecondary, marginBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subheading: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  emailText: { fontWeight: '600', color: PrimaryColors.main },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
    backgroundColor: '#FAFAFA',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resendText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  resendLink: {
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  timerText: {
    color: NeutralColors.textSecondary,
  },
  verifyButton: {
    backgroundColor: PrimaryColors.main,
    borderRadius: 25,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

