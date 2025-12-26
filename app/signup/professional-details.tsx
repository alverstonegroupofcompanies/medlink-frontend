import { FileUploadButton } from '@/components/file-upload-button';
import { DepartmentPicker } from '@/components/department-picker';
import { ThemedButton } from '@/components/themed-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ... (existing imports)

// ... (inside component)

            {Object.entries(formData)
              .filter(([key]) => key !== 'department_id') // Hide the raw input
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

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Department</ThemedText>
              <DepartmentPicker
                value={formData.department_id ? parseInt(formData.department_id) : null}
                onValueChange={(id) => handleInputChange('department_id', id ? id.toString() : '')}
                required={true}
                placeholder="Select Specialization/Department"
              />
            </View>
import { API_BASE_URL } from '../../config/api';
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
    department_id: '',
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
          data.append(key, value);
        }
      });

      // Files - Fix file URI for Android/iOS compatibility
      if (params.profilePhoto) {
        let profilePhotoUri = params.profilePhoto as string;
        if (typeof profilePhotoUri === 'string') {
            if (Platform.OS === 'android') {
                if (!profilePhotoUri.startsWith('file://')) {
                    profilePhotoUri = `file://${profilePhotoUri}`;
                }
            } else if (Platform.OS === 'ios') {
                profilePhotoUri = profilePhotoUri.replace('file://', '');
            }
            
            data.append('profile_photo', {
            uri: profilePhotoUri,
            name: 'profile.jpg',
            type: 'image/jpeg',
            } as any);
        }
      }

      Object.entries(files).forEach(([key, file]) => {
        if (file && file.uri) {
            let fileUri = file.uri;
            if (Platform.OS === 'android') {
                if (!fileUri.startsWith('file://')) {
                    fileUri = `file://${fileUri}`;
                }
            } else if (Platform.OS === 'ios') {
                fileUri = fileUri.replace('file://', '');
            }

            data.append(key, {
            uri: fileUri,
            name: file.name,
            type: file.type,
            } as any);
        }
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
      console.log('Error details:', {
        message: err.message,
        code: err.code,
        response: err.response?.status,
        url: err.config?.url,
        baseURL: err.config?.baseURL,
      });
      
      let message = 'Registration failed. Please try again.';
      let title = 'Registration Error';
      
      // Handle network errors
      if (!err.response) {
        // Network error - backend not reachable
        const attemptedUrl = err.config?.baseURL 
          ? `${err.config.baseURL}${err.config.url || ''}`
          : `${API_BASE_URL}${err.config?.url || '/doctor/register'}`;
        
        title = 'Connection Error';
        message = `Cannot connect to server.\n\nAttempted URL:\n${attemptedUrl}\n\nTroubleshooting Steps:\n\n`;
        message += '1. Backend server is running\n';
        message += '   Command: php artisan serve --host=0.0.0.0 --port=8080\n\n';
        message += '2. API URL is correct in frontend/.env file\n';
        message += '   Variable: EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8080\n\n';
        message += '3. Phone and computer are on same WiFi network\n\n';
        message += '4. Firewall allows port 8000\n';
        message += '   (Check Windows Firewall settings)\n\n';
        message += '5. Test connection from phone browser:\n';
        const testUrl = attemptedUrl.replace('/doctor/register', '/test');
        message += `   ${testUrl}\n\n`;
        message += '6. Restart Expo with cache clear:\n';
        message += '   npx expo start --clear';
      } else if (err.response?.data?.message) {
        // Server responded with error message
        message = err.response.data.message;
      } else if (err.response?.data?.errors) {
        // Handle validation errors
        const errors = err.response.data.errors;
        message = Object.values(errors).flat().join('\n');
      } else if (err.response?.status === 500) {
        title = 'Server Error';
        message = 'Server encountered an error. Please try again later or contact support.';
      } else if (err.response?.status === 422) {
        title = 'Validation Error';
        message = 'Please check all fields and try again.';
      }
      
      Alert.alert(title, message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <LinearGradient 
            colors={[PrimaryColors.main, PrimaryColors.lighter, NeutralColors.background]} 
            locations={[0, 0.5, 1]}
            style={styles.headerGradient}
          >
            <TouchableOpacity style={styles.backButton} onPress={() => {
              try {
                router.back();
              } catch (error) {
                router.replace('/signup/basic-details');
              }
            }}>
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
              <ThemedText style={styles.backText}>Back</ThemedText>
            </TouchableOpacity>

            <View style={styles.headerContent}>
              <ThemedText type="title" style={styles.heading}>
                Professional Details
              </ThemedText>
              <ThemedText style={styles.subheading}>
                Step 2 of 2: Complete your profile
              </ThemedText>
            </View>
          </LinearGradient>

          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <ThemedText style={styles.formTitle}>Professional Information</ThemedText>
              <ThemedText style={styles.formSubheading}>
                Add your qualifications and experience (optional fields are allowed)
              </ThemedText>
            </View>

            
import { DepartmentPicker } from '@/components/department-picker';

// ... imports remain ... 

// ... inside render ...

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
            
            <View style={{ marginBottom: 20 }}>
              <ThemedText style={styles.label}>Department / Specialization</ThemedText>
              <DepartmentPicker
                value={formData.department_id ? parseInt(formData.department_id.toString()) : null}
                onValueChange={(id) => handleInputChange('department_id', id ? id.toString() : '')}
                required={true}
                placeholder="Select your Department"
              />
            </View>

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
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  headerGradient: {
    borderBottomLeftRadius: 80,
    borderBottomRightRadius: 80,
    paddingTop: Platform.OS === 'ios' ? 70 : 60,
    paddingBottom: 70,
    paddingHorizontal: 30,
    minHeight: 220,
  },
  backButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 24,
  },
  backText: { 
    fontSize: 16, 
    marginLeft: 8,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  heading: { 
    fontSize: 36, 
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subheading: { 
    fontSize: 16, 
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  formCard: { 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 20, 
    marginTop: -50,
    borderRadius: 28, 
    padding: 28, 
    shadowColor: '#000', 
    shadowOpacity: 0.12, 
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  formHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: PrimaryColors.darkText,
    marginBottom: 8,
  },
  formSubheading: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
  },
  inputGroup: { marginBottom: 20 },
  label: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 10,
  },
  submitButton: { 
    marginTop: 24, 
    backgroundColor: PrimaryColors.main,
    borderRadius: 16,
    height: 56,
    shadowColor: PrimaryColors.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
