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
  Stethoscope
} from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  // No auto-login - user must always login manually

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
  
    setLoading(true);
  
    try {
      const response = await API.post('/doctor/login', {
        email: email.trim(),
        password: password.trim(),
      });
  
      const { token, doctor } = response.data;

      // Save authentication data using centralized function
      await saveDoctorAuth(token, doctor);

      // Register for push notifications after successful login
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
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
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
            <View style={[styles.card, isTablet && styles.cardTablet]}>
              
              {/* Header Icon */}
              <View style={styles.headerIconContainer}>
                <View style={styles.iconCircle}>
                   <Stethoscope size={24} color="#FFF" />
                </View>
                <ThemedText style={styles.headerTitle}>Verified Doctor Network</ThemedText>
              </View>

              {/* Login/Signup Toggle */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity style={styles.toggleActive}>
                  <ThemedText style={styles.toggleTextActive}>Log In</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={styles.toggleInactive} 
                    onPress={() => router.push('/signup/basic-details')}
                >
                  <ThemedText style={styles.toggleTextInactive}>Sign Up</ThemedText>
                </TouchableOpacity>
              </View>

              {/* Welcome Text */}
              <View style={styles.welcomeContainer}>
                <ThemedText style={styles.welcomeHeading}>Welcome Back, Doctor.</ThemedText>
                <ThemedText style={styles.welcomeSubheading}>
                  Secure access to premium medical shifts.
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
                <ThemedText style={styles.loginBtnText}>
                  {loading ? 'Verifying...' : 'Log In Securely'}
                </ThemedText>
              </TouchableOpacity>

              {/* Footer Badges */}
              <View style={styles.footerBadges}>
                <View style={styles.badge}>
                  <ShieldCheck size={16} color="#10B981" />
                  <ThemedText style={styles.badgeText}>HIPAA Compliant</ThemedText>
                </View>
                <View style={styles.divider} />
                <View style={styles.badge}>
                  <Lock size={16} color="#10B981" />
                  <ThemedText style={styles.badgeText}>Escrow Secured</ThemedText>
                </View>
              </View>
               
               <View style={styles.signupPrompt}>
                  <ThemedText style={styles.signupPromptText}>New here?</ThemedText>
                  <TouchableOpacity onPress={() => router.push('/signup/basic-details')}>
                    <ThemedText style={styles.signupLink}>Create an account</ThemedText>
                  </TouchableOpacity>
               </View>

               <View style={styles.hospitalLinkContainer}>
                   <Link href="/hospital/login" asChild>
                       <TouchableOpacity>
                         <ThemedText style={styles.hospitalLink}>Hospital Login</ThemedText>
                       </TouchableOpacity>
                   </Link>
               </View>

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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cardTablet: {
    maxWidth: 500,
    padding: 48,
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
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
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 6,
    marginBottom: 36,
  },
  toggleActive: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleInactive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleTextActive: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
  },
  toggleTextInactive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  welcomeContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeHeading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
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
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 16,
    height: '100%',
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 8,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -8,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
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
    marginBottom: 20,
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
  hospitalLinkContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  hospitalLink: {
     fontSize: 14,
     fontWeight: '600',
     color: '#64748B',
     textDecorationLine: 'underline',
  }

});
