import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import API from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { ScreenSafeArea } from '@/components/screen-safe-area';

import { LocationPickerMap } from '@/components/LocationPickerMap';

const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalRegisterScreen() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    address: '',
    latitude: '',
    longitude: '',
  });
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePickLogo = async () => {
    try {
      // Request media library permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need camera roll permissions to upload your hospital logo. Please enable it in your device settings.'
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
            `Logo must be less than ${maxSizeMB}MB. Your file is ${fileSizeMB.toFixed(2)}MB. Please compress the image and try again.`,
            [{ text: 'OK' }]
          );
          return;
        }

        setLogoUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('email', formData.email);
      data.append('password', formData.password);
      if (formData.phone_number) data.append('phone_number', formData.phone_number);
      if (formData.address) data.append('address', formData.address);
      if (formData.latitude) data.append('latitude', formData.latitude);
      if (formData.longitude) data.append('longitude', formData.longitude);
      if (logoUri) {
        const filename = logoUri.split('/').pop() || 'logo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        // Fix file URI for Android/iOS compatibility
        const fileUri = Platform.OS === 'ios' ? logoUri.replace('file://', '') : logoUri;
        data.append('logo_path', {
          uri: fileUri,
          name: filename,
          type: type,
        } as any);
      }

      const response = await API.post('/hospital/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { token, hospital } = response.data;

      // Save authentication data
      await AsyncStorage.setItem(HOSPITAL_TOKEN_KEY, token);
      await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospital));

      console.log('✅ Hospital registered successfully');
      console.log('📍 Token saved:', !!token);
      console.log('📍 Hospital info saved:', !!hospital);
      
      // Navigate immediately after saving
      setTimeout(() => {
        console.log('🚀 Navigating to hospital dashboard...');
        router.replace('/hospital/dashboard');
      }, 1000);
      
      // Show success message
      Alert.alert('✅ Success', 'Hospital registered successfully!');
    } catch (error: any) {
      console.log('Registration error:', error.response?.data || error.message);
      let message = 'Registration failed. Please try again.';
      
      if (error.message?.includes('Network') || error.message?.includes('connect')) {
        message = 'Cannot connect to server. Please check:\n\n1. Backend is running\n2. API URL is correct in .env file\n3. Phone and computer are on same WiFi (for local dev)\n4. Firewall allows port 8000 (for local dev)';
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        message = Object.values(errors).flat().join('\n');
      }
      
      Alert.alert('Registration Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                // If can't go back, navigate to login screen explicitly
                router.replace('/hospital/login');
              }
            }} activeOpacity={0.7}>
              <MaterialIcons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#11181C'} />
              <ThemedText style={[styles.backText, { color: colorScheme === 'dark' ? '#fff' : '#11181C' }]}>Back</ThemedText>
            </TouchableOpacity>
            <ThemedText style={[styles.heading, { color: colorScheme === 'dark' ? '#fff' : '#000' }]}>Hospital Registration</ThemedText>
            <ThemedText style={[styles.subheading, { color: colorScheme === 'dark' ? '#ccc' : '#666' }]}>Create your hospital account</ThemedText>
          </View>

          <View style={[styles.formCard, { backgroundColor: NeutralColors.cardBackground }]}>
            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Hospital Name *"
                value={formData.name}
                onChangeText={(text) => handleInputChange('name', text)}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Email *"
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Password *"
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Phone Number"
                value={formData.phone_number}
                onChangeText={(text) => handleInputChange('phone_number', text)}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedTextInput
                placeholder="Address"
                value={formData.address}
                onChangeText={(text) => handleInputChange('address', text)}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Hospital Location</ThemedText>
              <ThemedText style={styles.subLabel}>Drag map to pin exact location</ThemedText>
              <LocationPickerMap
                onLocationSelect={(lat, lng) => {
                  setFormData(prev => ({
                    ...prev,
                    latitude: lat.toString(),
                    longitude: lng.toString()
                  }));
                }}
                height={250}
              />
            </View>

            <TouchableOpacity style={styles.logoButton} onPress={handlePickLogo}>
              <ThemedText style={styles.logoButtonText}>
                {logoUri ? 'Logo Selected ✓' : 'Upload Hospital Logo'}
              </ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.fileSizeHint}>
              Maximum file size: 5MB (JPEG, PNG, JPG, or WEBP)
            </ThemedText>

            <ThemedButton
              title="Register"
              onPress={handleSubmit}
              loading={loading}
              style={[styles.submitButton, { backgroundColor: PrimaryColors.main }]}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NeutralColors.background },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 16, marginLeft: 8 },
  header: { marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '700' },
  subheading: { fontSize: 14, color: '#666', marginTop: 4 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  inputGroup: { marginBottom: 16 },
  logoButton: {
    padding: 16,
    backgroundColor: PrimaryColors.lighter,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: PrimaryColors.main,
    borderStyle: 'dashed',
  },
  logoButtonText: { color: PrimaryColors.main, fontWeight: '600' },
  fileSizeHint: {
    fontSize: 11,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    marginTop: -12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  submitButton: { marginTop: 10, backgroundColor: PrimaryColors.main },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
});

