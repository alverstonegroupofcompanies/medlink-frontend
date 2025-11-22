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
import { DepartmentPicker } from '@/components/department-picker';

export default function ProfessionalDetailsScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const [formData, setFormData] = useState({
    professionalAchievements: '',
    medicalCouncilRegNo: '',
    qualifications: '',
    specialization: '',
    department_id: null as number | null,
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

    if (!params.otp) {
      Alert.alert('Error', 'Email verification required. Please verify your email first.');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();

      // Basic Details
      data.append('name', params.fullName);
      data.append('email', params.emailId);
      data.append('password', params.password);
      data.append('otp', params.otp as string);
      data.append('phone_number', params.phoneNumber || '');

      // Professional Details
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== '') {
          // Convert department_id to string for FormData
          if (key === 'department_id') {
            data.append('department_id', value.toString());
          } else {
            data.append(key, value);
          }
        }
      });

      // Files - Fix file URI for Android/iOS compatibility
      if (params.profilePhoto) {
        const profilePhotoUri = Platform.OS === 'ios' ? (params.profilePhoto as string).replace('file://', '') : params.profilePhoto;
        data.append('profile_photo', {
          uri: profilePhotoUri,
          name: 'profile.jpg',
          type: 'image/jpeg',
        } as any);
      }

      Object.entries(files).forEach(([key, file]) => {
        const fileUri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;
        data.append(key, {
          uri: fileUri,
          name: file.name,
          type: file.type,
        } as any);
      });

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
        message = 'Cannot connect to server. Please check:\n\n1. Backend is running\n2. API URL is correct in .env file\n3. Phone and computer are on same WiFi (for local dev)\n4. Firewall allows port 8000 (for local dev)';
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
          <TouchableOpacity style={styles.backButton} onPress={() => {
            try {
              router.back();
            } catch (error) {
              // If can't go back, navigate to previous screen explicitly
              router.replace('/signup/basic-details');
            }
          }}>
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
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Department / Specialization *</ThemedText>
              <DepartmentPicker
                value={formData.department_id}
                onValueChange={(id) => setFormData(prev => ({ ...prev, department_id: id }))}
                placeholder="Select your department"
                required
              />
            </View>
            
            {Object.entries(formData)
              .filter(([key]) => key !== 'department_id')
              .map(([key, value]) => (
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
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  submitButton: { marginTop: 20, backgroundColor: PrimaryColors.main },
});
