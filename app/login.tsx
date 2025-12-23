import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { Card, Divider, useTheme } from 'react-native-paper';
import API from './api';
import { saveDoctorAuth } from '@/utils/auth';



export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const safeAreaStyle = [
    styles.safeArea,
    {
      paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 12),
      paddingBottom: Math.max(insets.bottom, 16),
      paddingHorizontal: isTablet ? 32 : 0,
    },
  ];

  const scrollContentStyle = [
    styles.scrollContent,
    isTablet && styles.scrollContentTablet,
  ];

  const formStyle = [
    styles.form,
    isTablet && styles.formTablet,
  ];

  // No auto-login - user must always login manually
  // Removed auto-login check to ensure users always see login screen

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
        // Don't block login if push notification registration fails
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
        message = 'Cannot connect to server.\n\nTroubleshooting:\n\n1. Backend must be running:\n   php artisan serve --host=0.0.0.0 --port=8000\n\n2. Check IP address in .env file\n   Current: http://172.30.143.201:8000\n\n3. If using mobile hotspot:\n   - Laptop hotspot: Use laptop\'s Wi-Fi IP\n   - Phone hotspot: Use laptop\'s IP from phone\'s network\n\n4. Test in phone browser:\n   http://172.30.143.201:8000/api/test\n\n5. Firewall: Allow port 8000';
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

  const handleSocialLogin = (provider: string) => {
    Alert.alert('Social Login', `${provider} login will be implemented`);
  };

  return (
    <SafeAreaView style={safeAreaStyle} edges={['top', 'right', 'left']}>
      <ThemedView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={PrimaryColors.lighter} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={scrollContentStyle}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient 
              colors={[PrimaryColors.main, PrimaryColors.lighter, NeutralColors.background]} 
              locations={[0, 0.5, 1]}
              style={styles.header}
            >
              <View style={styles.headerContent}>
                <ThemedText style={styles.helloText}>Hello!</ThemedText>
                <ThemedText style={styles.welcomeText}>Welcome back to</ThemedText>
                <ThemedText style={styles.appNameText}>Alverstone MedLink</ThemedText>
                <ThemedText style={styles.taglineText}>Your trusted medical platform</ThemedText>
              </View>
            </LinearGradient>

            <Card style={formStyle} mode="elevated" elevation={5}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.loginHeader}>
                <ThemedText variant="headlineLarge" style={styles.loginHeading}>
                  Login
                </ThemedText>
                <ThemedText style={styles.loginSubheading}>
                  Sign in to continue to your dashboard
                </ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedTextInput
                  label="Email"
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  leftIcon="email"
                  style={styles.input}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedTextInput
                  label="Password"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="password"
                  leftIcon="lock"
                  style={styles.input}
                />

                <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
                  <ThemedText
                    variant="labelLarge"
                    style={styles.forgotPasswordText}
                    lightColor={theme.colors.primary}
                    darkColor={theme.colors.primary}
                  >
                    Forgot Password?
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedButton
                title="Login"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <View style={styles.socialSection}>
                <View style={styles.divider}>
                  <Divider style={styles.dividerLine} />
                  <ThemedText variant="bodySmall" style={styles.dividerText}>or login with</ThemedText>
                  <Divider style={styles.dividerLine} />
                </View>

                <View style={styles.socialButtons}>
                  <TouchableOpacity
                    style={[styles.socialButton, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => handleSocialLogin('facebook')}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="titleMedium" style={styles.socialButtonText}>F</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.socialButton, { backgroundColor: theme.colors.surfaceVariant }]}
                    onPress={() => handleSocialLogin('google')}
                    activeOpacity={0.7}
                  >
                    <ThemedText variant="titleMedium" style={styles.socialButtonText}>G</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </Card.Content>
          </Card>

                    <View style={styles.signupContainer}>
                      <ThemedText style={styles.signupText}>Don't have an account?{' '}</ThemedText>
                      <Link href="/signup/basic-details" asChild>
                        <ThemedText
                          type="link"
                          style={styles.signupLink}
                          lightColor={PrimaryColors.main}
                          darkColor={PrimaryColors.light}
                        >
                          Sign Up
                        </ThemedText>
                      </Link>
                    </View>

                    <View style={styles.hospitalLinkContainer}>
                      <ThemedText style={styles.hospitalLinkText}>Are you a hospital?{' '}</ThemedText>
                      <Link href="/hospital/login" asChild>
                        <ThemedText
                          type="link"
                          style={styles.hospitalLink}
                          lightColor={PrimaryColors.main}
                          darkColor={PrimaryColors.light}
                        >
                          Hospital Login
                        </ThemedText>
                      </Link>
                    </View>
                </ScrollView>
              </KeyboardAvoidingView>
            </ThemedView>
          </SafeAreaView>
        );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: NeutralColors.background,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: { flex: 1, backgroundColor: NeutralColors.background },
  keyboardView: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center',
    paddingBottom: 20 
  },
  scrollContentTablet: { paddingHorizontal: 48, paddingBottom: 32 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    paddingHorizontal: 30,
    minHeight: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  helloText: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    marginBottom: 8,
    includeFontPadding: false,
  },
  welcomeText: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.9)', 
    marginTop: 0,
    fontWeight: '500',
  },
  appNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  taglineText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  form: {
    marginHorizontal: 24,
    marginTop: -30,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  formTablet: {
    alignSelf: 'center',
    width: '70%',
    maxWidth: 500,
  },
  cardContent: {
    paddingVertical: 0,
  },
  loginHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  loginHeading: { 
    fontSize: 24, 
    fontWeight: '700', 
    marginBottom: 6,
    color: PrimaryColors.darkText,
  },
  loginSubheading: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 16 },
  input: { 
    width: '100%', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    height: 50,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 8, marginBottom: 4 },
  forgotPasswordText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: PrimaryColors.main,
  },
  loginButton: { 
    marginTop: 8, 
    backgroundColor: PrimaryColors.main, 
    borderRadius: 12, 
    height: 50, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 16,
    shadowColor: PrimaryColors.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  socialSection: { alignItems: 'center', marginBottom: 24, marginTop: 8, display: 'none' },
  divider: { display: 'none' },
  dividerLine: { display: 'none' },
  dividerText: { display: 'none' },
  socialButtons: { display: 'none' },
  socialButton: { display: 'none' },
  socialButtonText: { display: 'none' },
  signupContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8,
  },
  signupText: { fontSize: 14, color: NeutralColors.textSecondary },
  signupLink: { fontSize: 14, fontWeight: '700', color: PrimaryColors.main },
  hospitalLinkContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 12,
  },
  hospitalLinkText: { fontSize: 14, color: NeutralColors.textSecondary },
  hospitalLink: { fontSize: 14, fontWeight: '700', color: PrimaryColors.main },
});
