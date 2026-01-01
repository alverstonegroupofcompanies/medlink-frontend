import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

import { SafeAreaView } from 'react-native-safe-area-context';

export default function BasicDetailsScreen() {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [password, setPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const colorScheme = useColorScheme();

  const handlePickImage = async () => {
    try {
      // Request media library permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need camera roll permissions to upload your profile photo. Please enable it in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const fileSizeMB = (result.assets[0].fileSize || 0) / (1024 * 1024);
        const maxSizeMB = 5;

        if (fileSizeMB > maxSizeMB) {
          Alert.alert(
            'File Too Large',
            `Profile photo must be less than ${maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(2)}MB. Please compress the image and try again.`,
            [{ text: 'OK' }]
          );
          return;
        }

        setProfilePhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const handleNext = async () => {
    if (!fullName.trim()) return Alert.alert('Error', 'Please enter your full name');
    if (!phoneNumber.trim()) return Alert.alert('Error', 'Please enter your phone number');
    if (!emailId.trim()) return Alert.alert('Error', 'Please enter your email ID');
    if (!password.trim() || password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailId)) {
      return Alert.alert('Error', 'Please enter a valid email address');
    }

    // Send OTP to email
    setSendingOtp(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/send-otp`, {
        email: emailId,
        type: 'doctor',
      });

      if (response.data.status) {
        // Navigate to OTP verification screen
        router.push({
          pathname: '/signup/verify-otp',
          params: {
            fullName,
            phoneNumber,
            emailId,
            password,
            profilePhoto: profilePhoto || '',
          },
        });
      } else {
        Alert.alert('Error', response.data.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send verification code. Please try again.'
      );
    } finally {
      setSendingOtp(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.push('/login')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              <ThemedText style={styles.backText}>Back to Login</ThemedText>
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <ThemedText style={styles.signUpText}>Create Account</ThemedText>
              <ThemedText style={styles.subtitleText}>Step 1 of 2: Basic Information</ThemedText>
            </View>
          </View>

          {/* White Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <ThemedText style={styles.heading}>Basic Details</ThemedText>
              <ThemedText style={styles.formSubheading}>Fill in your personal information to get started</ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Full Name"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Email ID"
                value={emailId}
                onChangeText={setEmailId}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={[styles.profilePhotoButton, { borderColor: colorScheme === 'dark' ? '#374151' : '#e5e7eb' }]}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              {profilePhoto ? (
                <Image source={{ uri: profilePhoto }} style={styles.profileImage} />
              ) : (
                <>
                  <MaterialIcons name="camera-alt" size={24} color="#6b7280" />
                  <ThemedText style={styles.profilePhotoText}>Profile Photo</ThemedText>
                </>
              )}
            </TouchableOpacity>
            <ThemedText style={styles.fileSizeHint}>
              Maximum file size: 5MB (JPEG, PNG, JPG, or WEBP)
            </ThemedText>

            <ThemedButton
              title={sendingOtp ? 'Sending OTP...' : 'Send Verification Code'}
              onPress={handleNext}
              loading={sendingOtp}
              style={styles.nextButton}
            />
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
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { 
    flexGrow: 1, 
    padding: 24,
    paddingTop: 12,
  },
  header: { 
    paddingTop: 10, 
    paddingBottom: 32, 
    paddingHorizontal: 8,
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24,
    paddingVertical: 8,
  },
  backText: { 
    fontSize: 16, 
    marginLeft: 8, 
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'flex-start',
    paddingLeft: 4,
  },
  signUpText: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  formCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 32, 
    paddingVertical: 32, 
    paddingHorizontal: 24, 
    shadowColor: '#000', 
    shadowOpacity: 0.15, 
    shadowRadius: 24, 
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  formHeader: {
    marginBottom: 28,
    alignItems: 'center',
  },
  heading: { 
    fontSize: 24, 
    fontWeight: '800', 
    marginBottom: 8,
    color: '#1E3A8A',
  },
  formSubheading: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 20 },
  input: { 
    borderWidth: 1.5, 
    borderColor: '#E2E8F0', 
    borderRadius: 16, 
    backgroundColor: '#F8FAFC', 
    paddingHorizontal: 18, 
    height: 56,
    fontSize: 16,
  },
  profilePhotoButton: { 
    borderWidth: 2, 
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 20, 
    padding: 24, 
    minHeight: 140, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 8, 
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  profileImage: { 
    width: 120, 
    height: 120, 
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profilePhotoText: { 
    marginTop: 12, 
    fontSize: 15, 
    color: '#64748B',
    fontWeight: '600',
  },
  fileSizeHint: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: -8,
  },
  nextButton: { 
    backgroundColor: '#2563EB', 
    borderRadius: 16, 
    height: 56, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
});
