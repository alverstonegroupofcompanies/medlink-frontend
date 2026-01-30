import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ErrorModal } from '@/components/ErrorModal';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@medlink.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorType, setErrorType] = useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 900;

  const safeAreaStyle = [
    styles.container,
    {
      paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 16 : 12),
      paddingBottom: Math.max(insets.bottom, 16),
      paddingHorizontal: isTablet ? 32 : 20,
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

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/login`, {
        email,
        password,
      });

      if (response.data.status) {
        await AsyncStorage.setItem('admin_token', response.data.token);
        await AsyncStorage.setItem('admin_data', JSON.stringify(response.data.admin));
        router.replace('/admin/dashboard');
      }
    } catch (error: any) {
      let message = 'Login failed. Please try again.';
      let errorTypeValue: string | null = null;
      
      if (!error.response) {
        message = error.message || 'Cannot connect to server. Please check your internet connection.';
      } else if (error.response?.data?.error_type) {
        errorTypeValue = error.response.data.error_type;
        message = error.response.data.message || message;
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      
      setErrorMessage(message);
      setErrorType(errorTypeValue);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDefault = async () => {
    setResetting(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/admin/reset-default`);
      if (response.data?.status) {
        setEmail(response.data.email ?? 'admin@medlink.com');
        setPassword(response.data.password ?? 'Admin@123');
        Alert.alert('Reset Done', 'Admin reset to default. You can login now.');
      } else {
        Alert.alert('Reset Failed', response.data?.message || 'Reset not available.');
      }
    } catch (e: any) {
      Alert.alert(
        'Reset Failed',
        e.response?.data?.message || 'Reset is only available in development. Run: php artisan db:seed --class=AdminSeeder'
      );
    } finally {
      setResetting(false);
    }
  };

  return (
    <SafeAreaView style={safeAreaStyle} edges={['top', 'right', 'left']}>
      <ErrorModal
        visible={showErrorModal}
        title="Login Error"
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={scrollContentStyle} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Admin Login</Text>
            <Text style={styles.subtitle}>MedLink Administration</Text>
          </View>

          <View style={formStyle}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="admin@medlink.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Admin@123"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.resetButton, resetting && styles.resetButtonDisabled]}
              onPress={handleResetDefault}
              disabled={resetting || loading}
            >
              {resetting ? (
                <ActivityIndicator color="#64748b" size="small" />
              ) : (
                <Text style={styles.resetButtonText}>Reset to default admin</Text>
              )}
            </TouchableOpacity>

            <View style={styles.credentialsInfo}>
              <Text style={styles.credentialsTitle}>Default Credentials</Text>
              <Text style={styles.credentialsText}>
                Email: admin@medlink.com{'\n'}
                Password: Admin@123
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  scrollContentTablet: {
    paddingVertical: 40,
    paddingHorizontal: 48,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  form: {
    width: '100%',
  },
  formTablet: {
    alignSelf: 'center',
    width: '80%',
    maxWidth: 520,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: '#1e293b',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  loginButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  resetButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#64748b',
    textDecorationLine: 'underline',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: 0.5,
  },
  credentialsInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  credentialsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  credentialsText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
});

