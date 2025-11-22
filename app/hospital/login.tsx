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
      await AsyncStorage.setItem(HOSPITAL_TOKEN_KEY, token);
      await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospital));

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
              <ThemedText style={styles.helloText}>Hello Hospital!</ThemedText>
              <ThemedText style={styles.welcomeText}>Welcome to</ThemedText>
              <ThemedText style={styles.welcomeText}>Alverstone MedLink</ThemedText>
            </LinearGradient>

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

            <ThemedButton
              title="Login"
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

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

            <View style={styles.backContainer}>
              <Link href="/login" asChild>
                <ThemedText
                  type="link"
                  style={styles.backLink}
                  lightColor={PrimaryColors.main}
                  darkColor={PrimaryColors.light}
                >
                  ← Back to Doctor Login
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
  loginButton: { marginTop: 8, backgroundColor: PrimaryColors.main, borderRadius: 25, height: 50, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  signupContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  signupText: { fontSize: 14, color: NeutralColors.textSecondary },
  signupLink: { fontSize: 14, fontWeight: '600', color: PrimaryColors.main },
  backContainer: { marginTop: 20, alignItems: 'center' },
  backLink: { fontSize: 14, fontWeight: '600', color: PrimaryColors.main },
});

