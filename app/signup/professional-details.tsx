import { FileUploadButton } from '@/components/file-upload-button';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { saveDoctorAuth } from '@/utils/auth';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ProfessionalDetailsScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [formData, setFormData] = useState({
    professionalAchievements: '',
    medicalCouncilRegNo: '',
    qualifications: '',
    specialization: '',
    experience: '',
    currentHospital: '',
    currentLocation: '',
    preferredWorkType: '',
    preferredLocation: '',
  });
  const [files, setFiles] = useState<Record<string, { uri: string; name: string; type: string }>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.fullName) router.replace('/signup/basic-details');
  }, []);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (key: string, uri: string, name: string, type: string) => {
    setFiles(prev => ({ ...prev, [key]: { uri, name, type } }));
  };

  const handleSubmit = async () => {
    if (!params.emailId || !params.password || !params.fullName) {
      Alert.alert('Error', 'Missing basic details.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();

      // Basic Details
      data.append('name', params.fullName);
      data.append('email', params.emailId);
      data.append('password', params.password);
      data.append('phone_number', params.phoneNumber || '');

      // Professional Details
      Object.entries(formData).forEach(([key, value]) => value && data.append(key, value));

      // Files
      if (params.profilePhoto)
        data.append('profile_photo', { uri: params.profilePhoto, name: 'profile.jpg', type: 'image/jpeg' } as any);

      Object.entries(files).forEach(([key, file]) =>
        data.append(key, { uri: file.uri, name: file.name, type: file.type } as any)
      );

      const res = await API.post('/doctor/register', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { token, doctor } = res.data;

      // Save authentication data using centralized function
      await saveDoctorAuth(token, doctor);

      // Calculate initial profile completion
      const completion = calculateProfileCompletion(doctor);
      const percentage = Math.round(completion * 100);

      Alert.alert(
        'Success',
        `Doctor registered successfully!\nProfile Status: ${percentage}%`,
        [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]
      );
    } catch (err: any) {
      console.log('Registration error:', err.response?.data || err.message);
      let message = 'Registration failed. Please try again.';
      
      // Handle network errors
      if (err.message?.includes('Network') || err.message?.includes('connect')) {
        message = 'Cannot connect to server. Please check:\n\n1. Backend is running\n2. IP address is correct in config/api.ts\n3. Phone and computer are on same WiFi\n4. Firewall allows port 8000';
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        message = Object.values(errors).flat().join('\n');
      }
      
      Alert.alert('Registration Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#ECEDEE' : '#11181C'} />
            <ThemedText style={styles.backText}>Back</ThemedText>
          </TouchableOpacity>

          <View style={styles.header}>
            <ThemedText type="title" style={styles.heading}>
              Professional Details
            </ThemedText>
            <ThemedText style={styles.subheading}>
              Fill in your professional info (optional fields are allowed)
            </ThemedText>
          </View>

          <View style={styles.formCard}>
            {Object.entries(formData).map(([key, value]) => (
              <ThemedTextInput
                key={key}
                placeholder={key.replace(/([A-Z])/g, ' $1')}
                value={value}
                onChangeText={(v) => handleInputChange(key, v)}
                multiline={key === 'professionalAchievements'}
                keyboardType={key === 'experience' ? 'numeric' : 'default'}
              />
            ))}

            <FileUploadButton label="Upload Degree Certificates" onFileSelected={(uri, name, type) => handleFileUpload('degree_certificate', uri, name, type)} type="document" />
            <FileUploadButton label="ID Proof" onFileSelected={(uri, name, type) => handleFileUpload('id_proof', uri, name, type)} type="both" />
            <FileUploadButton label="Medical Registration Certificate" onFileSelected={(uri, name, type) => handleFileUpload('medical_registration_certificate', uri, name, type)} type="document" />

            <ThemedButton title="Submit" onPress={handleSubmit} loading={loading} style={styles.submitButton} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 40 },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { fontSize: 16, marginLeft: 8 },
  header: { marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: '700' },
  subheading: { fontSize: 14, color: '#666', marginTop: 4 },
  formCard: { backgroundColor: NeutralColors.cardBackground, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 3 },
  submitButton: { marginTop: 20, backgroundColor: PrimaryColors.main },
});
