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
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Curved Header */}
          <LinearGradient colors={[PrimaryColors.lighter, NeutralColors.background]} style={styles.header}>
          <TouchableOpacity
    style={styles.backButton}
    onPress={() => router.push('/login')} // go to Login screen
    activeOpacity={0.7}
  >
              <MaterialIcons name="arrow-back" size={24} color="#11181C" />
              <ThemedText style={styles.backText}>Back to Login</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.signUpText}>Sign Up</ThemedText>
          </LinearGradient>

          {/* White Form Card */}
          <View style={styles.formCard}>
            <ThemedText style={styles.registerText}>Register here</ThemedText>
            <ThemedText style={styles.heading}>Basic Details</ThemedText>

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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeutralColors.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { borderBottomLeftRadius: 80, borderBottomRightRadius: 80, paddingTop: 70, paddingBottom: 60, paddingHorizontal: 30 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 16, marginLeft: 8, color: '#11181C' },
  signUpText: { fontSize: 32, fontWeight: '700', color: '#000' },
  formCard: { backgroundColor: NeutralColors.cardBackground, marginHorizontal: 20, marginTop: -40, borderRadius: 25, paddingVertical: 30, paddingHorizontal: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
  registerText: { fontSize: 14, color: NeutralColors.textSecondary, marginBottom: 8 },
  heading: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  inputGroup: { marginBottom: 16 },
  input: { borderWidth: 1, borderColor: NeutralColors.border, borderRadius: 25, backgroundColor: '#FAFAFA', paddingHorizontal: 15, height: 48 },
  profilePhotoButton: { borderWidth: 1, borderRadius: 12, padding: 20, minHeight: 120, justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 20 },
  profileImage: { width: 100, height: 100, borderRadius: 50 },
  profilePhotoText: { marginTop: 8, fontSize: 16, color: NeutralColors.textSecondary },
  fileSizeHint: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  nextButton: { backgroundColor: PrimaryColors.main, borderRadius: 25, height: 50, justifyContent: 'center', alignItems: 'center' },
});
