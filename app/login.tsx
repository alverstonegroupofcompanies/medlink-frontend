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
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F9" />
      <LinearGradient
        colors={['#F0F4F8', '#E6EBF1', '#DCE3EB']}
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
    backgroundColor: '#F0F4F8',
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
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  cardTablet: {
    maxWidth: 480,
    padding: 40,
  },
  headerIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A', // Dark Navy
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 32,
  },
  toggleActive: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleInactive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleTextActive: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  toggleTextInactive: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  welcomeContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  welcomeHeading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubheading: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 50,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    height: '100%',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB', // Bright Blue
  },
  loginBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  loginBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footerBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#E2E8F0',
  },
  signupPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  signupPromptText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  signupLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  hospitalLinkContainer: {
    alignItems: 'center',
  },
  hospitalLink: {
     fontSize: 13,
     fontWeight: '600',
     color: '#64748B',
     textDecorationLine: 'underline',
  }

});
