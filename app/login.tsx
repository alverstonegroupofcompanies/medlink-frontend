import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, SafeAreaView, StatusBar } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import API from './api';
import { saveDoctorAuth } from '@/utils/auth';



export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

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
  
      Alert.alert('✅ Login Successful', 'Welcome back, doctor!');

      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1200);

    } catch (error: any) {
      console.log('Login error:', error.response?.data || error.message);
      let message = 'Login failed. Please try again.';
      
      // Handle network errors
      if (error.message?.includes('Network') || error.message?.includes('connect')) {
        message = 'Cannot connect to server. Please check:\n\n1. Backend is running\n2. IP address is correct in config/api.ts\n3. Phone and computer are on same WiFi\n4. Firewall allows port 8000';
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
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={PrimaryColors.lighter} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <LinearGradient colors={[PrimaryColors.lighter, NeutralColors.background]} style={styles.header}>
              <ThemedText style={styles.helloText}>Hello !</ThemedText>
              <ThemedText style={styles.welcomeText}>Welcome to</ThemedText>
              <ThemedText style={styles.welcomeText}>Alverstone MedLink</ThemedText>
            </LinearGradient>

          <View style={styles.form}>
            <ThemedText type="title" style={styles.loginHeading}>
              Login
            </ThemedText>

            <View style={styles.inputGroup}>
              <ThemedTextInput
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
                  style={styles.forgotPasswordText}
                  lightColor={PrimaryColors.main}
                  darkColor={PrimaryColors.light}
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
                <View style={styles.dividerLine} />
                <ThemedText style={styles.dividerText}>or login with</ThemedText>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity
                  style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6' }]}
                  onPress={() => handleSocialLogin('facebook')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.socialButtonText}>F</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.socialButton, { backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6' }]}
                  onPress={() => handleSocialLogin('google')}
                  activeOpacity={0.7}
                >
                  <ThemedText style={styles.socialButtonText}>G</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

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
  loginHeading: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  input: { width: '100%', borderRadius: 25, paddingHorizontal: 15, height: 48 },
  forgotPassword: { alignSelf: 'flex-end', marginTop: 8 },
  forgotPasswordText: { fontSize: 14, fontWeight: '500', color: NeutralColors.textSecondary },
  loginButton: { marginTop: 8, backgroundColor: PrimaryColors.main, borderRadius: 25, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  socialSection: { alignItems: 'center', marginBottom: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: NeutralColors.divider },
  dividerText: { marginHorizontal: 10, fontSize: 13, color: NeutralColors.textTertiary },
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
