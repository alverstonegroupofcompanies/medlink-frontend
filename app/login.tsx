import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { 
  Alert, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  View, 
  StatusBar, 
  useWindowDimensions,
  TextInput,
  Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import API from './api';
import { saveDoctorAuth } from '@/utils/auth';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Activity,
  CheckCircle,
  Stethoscope,
  Building2,
  User
} from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userType, setUserType] = useState<'doctor' | 'hospital'>('doctor');
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;

  // No auto-login - user must always login manually

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
  
    setLoading(true);
  
    try {
      const endpoint = userType === 'doctor' ? '/doctor/login' : '/hospital/login';
      const response = await API.post(endpoint, {
        email: email.trim(),
        password: password.trim(),
      });
  
      if (userType === 'doctor') {
        const { token, doctor } = response.data;
        await saveDoctorAuth(token, doctor);
        
        // Register for push notifications
        try {
          const { registerForPushNotifications } = require('@/utils/notifications');
          await registerForPushNotifications();
        } catch (error) {
          console.warn('⚠️ Failed to register for push notifications:', error);
        }

        Alert.alert('✅ Login Successful', 'Welcome back, doctor!');
        setTimeout(() => {
          router.replace('/(tabs)');
        }, 1200);
      } else {
        const { token, hospital } = response.data;
        const { saveHospitalAuth } = require('@/utils/auth');
        await saveHospitalAuth(token, hospital);
        
        // Register for push notifications
        try {
          const { registerForPushNotifications } = require('@/utils/notifications');
          await registerForPushNotifications('hospital');
        } catch (error) {
          console.warn('⚠️ Failed to register for push notifications:', error);
        }

        Alert.alert('✅ Login Successful', 'Welcome back!');
        setTimeout(() => {
          router.replace('/hospital/dashboard');
        }, 1200);
      }

    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      let message = 'Login failed. Please try again.';
      
      // Handle network errors
      if (error.message?.includes('Network') || error.message?.includes('connect')) {
        message = 'Cannot connect to server. Please check your internet connection.';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        message = Object.values(errors).flat().join('\n');
      }
      
      Alert.alert('Login Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Feature not implemented yet.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      
      {/* Full-screen background app icon */}
      <Image
        source={require('@/assets/images/icon.png')}
        style={styles.fullBackgroundImage}
        resizeMode="cover"
      />
      
      {/* Overlay for better readability */}
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
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              
              {/* Header Icon */}
              <View style={styles.headerIconContainer}>
                <View style={styles.iconCircle}>
                   <Stethoscope size={24} color="#2563EB" />
                </View>
                <View style={styles.headerTitleContainer}>
                  <ThemedText style={styles.headerTitle}>AlverConnect</ThemedText>
                  <ThemedText style={styles.headerTagline}>The digital bridge for medical professionals</ThemedText>
                </View>
              </View>

              {/* Doctor/Hospital Toggle */}
              <View style={styles.userTypeToggleContainer}>
                <TouchableOpacity 
                  style={[styles.userTypeToggle, userType === 'doctor' && styles.userTypeToggleActive]}
                  onPress={() => setUserType('doctor')}
                >
                  <User size={18} color={userType === 'doctor' ? '#FFFFFF' : '#64748B'} />
                  <ThemedText style={[styles.userTypeToggleText, userType === 'doctor' && styles.userTypeToggleTextActive]}>
                    Doctor
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.userTypeToggle, userType === 'hospital' && styles.userTypeToggleActive]}
                  onPress={() => setUserType('hospital')}
                >
                  <Building2 size={18} color={userType === 'hospital' ? '#FFFFFF' : '#64748B'} />
                  <ThemedText style={[styles.userTypeToggleText, userType === 'hospital' && styles.userTypeToggleTextActive]}>
                    Hospital
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {/* Welcome Text */}
              <View style={styles.welcomeContainer}>
                <ThemedText style={styles.welcomeHeading}>
                  Welcome Back, {userType === 'doctor' ? 'Doctor' : 'Hospital'}.
                </ThemedText>
                <ThemedText style={styles.welcomeSubheading}>
                  {userType === 'doctor' 
                    ? 'Secure access to premium medical shifts.'
                    : 'Manage your medical staff and job postings.'}
                </ThemedText>
              </View>

              {/* Inputs */}
              <View style={styles.formContainer}>
                <ThemedText style={styles.inputLabel}>Email or Phone Number</ThemedText>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your credentials"
                    placeholderTextColor="#94A3B8"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#64748B" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                    {showPassword ? (
                      <EyeOff size={20} color="#64748B" />
                    ) : (
                      <Eye size={20} color="#64748B" />
                    )}
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                  <ThemedText style={styles.forgotText}>Forgot Password?</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                style={styles.loginBtn} 
                onPress={handleLogin}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#2563EB', '#3B82F6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginBtnGradient}
                >
                  <ThemedText style={styles.loginBtnText}>
                    {loading ? 'Verifying...' : 'Log In Securely'}
                  </ThemedText>
                </LinearGradient>
              </TouchableOpacity>

              {/* Sign Up Prompt */}
              <View style={styles.signupPrompt}>
                <ThemedText style={styles.signupPromptText}>New here? </ThemedText>
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      userType === 'doctor'
                        ? '/register/doctor/step1-email'
                        : '/register/hospital/step1-email'
                    )
                  }
                >
                  <ThemedText style={styles.signupLink}>Create an account</ThemedText>
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
    backgroundColor: 'rgba(30, 64, 175, 0.7)', // Blue overlay for better text readability
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
  cardTablet: {
    maxWidth: 500,
    padding: 48,
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
    backgroundColor: '#EFF6FF', // Light Blue
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A', // Dark Blue
    letterSpacing: 0.5,
  },
  userTypeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 6,
    marginBottom: 24,
    gap: 6,
  },
  userTypeToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  userTypeToggleActive: {
    backgroundColor: '#2563EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userTypeToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  userTypeToggleTextActive: {
    fontWeight: '700',
    color: '#FFFFFF',
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
    // Prevent bottom glyph clipping (notably on Android) for bold/large text
    lineHeight: 34,
    includeFontPadding: false,
    paddingBottom: 2,
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
  eyeIcon: {
    padding: 8,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  loginBtn: {
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  loginBtnGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', // Ensure gradient fills the button
    borderRadius: 16, // Match parent borderRadius
  },
  loginBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    gap: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '600',
  },
  divider: {
    display: 'none',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    marginBottom: 10,
  },
  signupPromptText: {
    fontSize: 15,
    color: '#64748B',
  },
  signupLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
});
