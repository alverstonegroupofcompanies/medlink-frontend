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
            <LinearGradient colors={[PrimaryColors.lighter, NeutralColors.background]} style={styles.header}>
              <ThemedText style={styles.helloText}>Hello !</ThemedText>
              <ThemedText style={styles.welcomeText}>Welcome to</ThemedText>
              <ThemedText style={styles.welcomeText}>Alverstone MedLink</ThemedText>
            </LinearGradient>

          <Card style={formStyle} mode="elevated" elevation={4}>
            <Card.Content>
              <ThemedText variant="headlineLarge" style={styles.loginHeading}>
                Login
              </ThemedText>

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
  scrollContent: { flexGrow: 1, paddingBottom: 20 },
  scrollContentTablet: { paddingHorizontal: 48, paddingBottom: 32 },
  header: {
    backgroundColor: PrimaryColors.lighter,
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 60,
    paddingHorizontal: 30,
    alignItems: 'flex-start',
    minHeight: 200,
  },
  helloText: { 
    fontSize: 38, 
    fontWeight: '700', 
    color: PrimaryColors.darkText, 
    marginBottom: 12,
    lineHeight: 48,
    includeFontPadding: false,
  },
  welcomeText: { 
    fontSize: 16, 
    color: NeutralColors.textSecondary, 
    marginTop: 2,
    lineHeight: 22,
    includeFontPadding: false,
  },
  form: {
    marginHorizontal: 20,
    marginTop: -40,
    borderRadius: 25,
  },
  formTablet: {
    alignSelf: 'center',
    width: '80%',
    maxWidth: 640,
    paddingVertical: 40,
    paddingHorizontal: 36,
  },
  loginHeading: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  input: { width: '100%', borderRadius: 25, paddingHorizontal: 15, height: 48 },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 8 },
  forgotPasswordText: { fontSize: 14, fontWeight: '500', color: NeutralColors.textSecondary },
  loginButton: { marginTop: 8, backgroundColor: PrimaryColors.main, borderRadius: 25, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  socialSection: { alignItems: 'center', marginBottom: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, width: '100%' },
  dividerLine: { flex: 1 },
  dividerText: { marginHorizontal: 10 },
  socialButtons: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  socialButton: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: NeutralColors.divider },
  socialButtonText: { fontSize: 22, fontWeight: '700', color: NeutralColors.textPrimary },
          signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
          signupText: { fontSize: 14, color: NeutralColors.textSecondary },
          signupLink: { fontSize: 14, fontWeight: '600', color: PrimaryColors.main },
          hospitalLinkContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 16 },
          hospitalLinkText: { fontSize: 14, color: NeutralColors.textSecondary },
          hospitalLink: { fontSize: 14, fontWeight: '600', color: PrimaryColors.main },
        });
