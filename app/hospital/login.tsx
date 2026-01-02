import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View, StatusBar, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import API from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
      const response = await API.post('/hospital/login', {
        email: email.trim(),
        password: password.trim(),
      });
  
      const { token, hospital } = response.data;

      // Save authentication data
      const { saveHospitalAuth } = require('@/utils/auth');
      await saveHospitalAuth(token, hospital);

      // Register for push notifications after successful login
      try {
        const { registerForPushNotifications } = require('@/utils/notifications');
        await registerForPushNotifications('hospital');
      } catch (error) {
        console.warn('⚠️ Failed to register for push notifications:', error);
        // Don't block login if push notification registration fails
      }

      setLoading(false);
      
      // Show success alert
      Alert.alert('✅ Login Successful', 'Welcome back!');
      
      // Navigate after alert
      setTimeout(() => {
        router.replace('/hospital/dashboard');
      }, 500);
    } catch (error: any) {
      setLoading(false);
      console.log('Login error:', error.response?.data || error.message);
      let message = 'Login failed. Please try again.';
      
      if (error.message?.includes('Network') || error.message?.includes('connect')) {
        message = 'Cannot connect to server.\n\nTroubleshooting:\n\n1. Backend must be running:\n   php artisan serve --host=0.0.0.0 --port=8000\n\n2. Check IP address in .env file\n   Current: http://172.30.143.201:8000\n\n3. If using mobile hotspot:\n   - Laptop hotspot: Use laptop\'s Wi-Fi IP\n   - Phone hotspot: Use laptop\'s IP from phone\'s network\n\n4. Test in phone browser:\n   http://172.30.143.201:8000/api/test\n\n5. Firewall: Allow port 8000';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        message = Object.values(errors).flat().join('\n');
      }
      
      // Show error alert
      Alert.alert('Login Error', message);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#60a5fa']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      >
        {/* Animated background circles */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        
        <SafeAreaView style={safeAreaStyle} edges={['top', 'right', 'left']}>
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
              <View style={styles.header}>
                <ThemedText style={styles.helloText}>Hello Hospital!</ThemedText>
                <ThemedText style={styles.welcomeText}>Welcome to Alverstone MedLink</ThemedText>
              </View>

          <View style={formStyle}>
            <ThemedText type="title" style={styles.loginHeading}>
              Hospital Login
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
            </View>

            <TouchableOpacity 
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={loading}
            >
              <LinearGradient
                colors={['#2563EB', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtnGradient}
              >
                {loading ? (
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '600' }}>Logging in...</ThemedText>
                ) : (
                  <ThemedText style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 17 }}>Login</ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.signupContainer}>
              <ThemedText style={styles.signupText}>Don't have an account?{' '}</ThemedText>
              <Link href="/hospital/register" asChild>
                <ThemedText
                  type="link"
                  style={styles.signupLink}
                  lightColor={PrimaryColors.main}
                  darkColor={PrimaryColors.light}
                >
                  Register
                </ThemedText>
              </Link>
            </View>

            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.push('/login')}
            >
              <ThemedText style={styles.backButtonText}>← Back to Doctor Login</ThemedText>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  bgCircle1: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -200,
    right: -100,
  },
  bgCircle2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -150,
    left: -100,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center',
    padding: 24,
  },
  scrollContentTablet: { paddingHorizontal: 48, paddingBottom: 32 },
  header: {
    paddingTop: Platform.OS === 'ios' ? 12 : 12,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helloText: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  welcomeText: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.9)', 
    marginTop: 0,
    fontWeight: '500',
    textAlign: 'center',
  },
  form: {
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
  formTablet: {
    alignSelf: 'center',
    width: '70%',
    maxWidth: 500,
  },
  loginHeading: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 20, 
    textAlign: 'center',
    color: '#1E3A8A'
  },
  inputGroup: { marginBottom: 16 },
  input: { 
    width: '100%', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 56,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    fontSize: 16,
  },
  loginButton: { 
    marginTop: 4, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 20,
    overflow: 'hidden',
  },
  loginBtnGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderRadius: 16,
  },
  signupContainer: { 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 16, 
  },
  signupText: { fontSize: 15, color: '#64748B' },
  signupLink: { fontSize: 15, fontWeight: '700', color: '#2563EB' },
  backButton: {
    marginTop: 16,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(100, 116, 139, 0.15)',
  },
  backButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
});

