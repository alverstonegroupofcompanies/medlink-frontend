import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_BASE_URL, BASE_BACKEND_URL } from '../../../../config/api';
import { ArrowLeft, Save, Camera, User } from 'lucide-react-native';
import { ImageCropPicker } from '@/components/ImageCropPicker';

export default function EditDoctor() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    current_location: '',
    qualifications: '',
    experience: '',
    medical_council_reg_no: '',
    current_hospital: '',
    preferred_work_type: '',
    preferred_location: '',
    professional_achievements: '',
    department_id: '',
  });
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);

  useEffect(() => {
    loadDoctor();
  }, [id]);

  const loadDoctor = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/doctors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        const doctorData = response.data.doctor;
        setDoctor(doctorData);
        
        
        setFormData({
          name: doctorData.name || '',
          email: doctorData.email || '',
          phone_number: doctorData.phone_number || '',
          current_location: doctorData.current_location || '',
          qualifications: doctorData.qualifications || '',
          experience: doctorData.experience || '',
          medical_council_reg_no: doctorData.medical_council_reg_no || '',
          current_hospital: doctorData.current_hospital || '',
          preferred_work_type: doctorData.preferred_work_type || '',
          preferred_location: doctorData.preferred_location || '',
          professional_achievements: doctorData.professional_achievements || '',
          department_id: doctorData.department_id || '',
        });
        if (doctorData.profile_photo) {
          const photoUrl = doctorData.profile_photo.startsWith('http')
            ? doctorData.profile_photo
            : `${BASE_BACKEND_URL}/app/${doctorData.profile_photo}`;
          setProfilePhotoUri(photoUrl);
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load doctor details');
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePhotoSelected = (uri: string) => {
    if (uri) {
      setProfilePhotoUri(uri);
      setProfilePhoto(uri);
    } else {
      setProfilePhotoUri(null);
      setProfilePhoto(null);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      Alert.alert('Validation Error', 'Name and Email are required');
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const formDataToSend = new FormData();

      // Add all form fields
      Object.keys(formData).forEach((key) => {
        if (formData[key as keyof typeof formData]) {
          formDataToSend.append(key, formData[key as keyof typeof formData] as string);
        }
      });

      // Add profile photo if selected
      if (profilePhoto) {
        const filename = profilePhoto.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formDataToSend.append('profile_photo', {
          uri: profilePhoto,
          name: filename,
          type,
        } as any);
      }

      const response = await axios.put(
        `${API_BASE_URL}/admin/doctors/${id}`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.status) {
        Alert.alert('Success', 'Doctor updated successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', response.data.message || 'Failed to update doctor');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to update doctor'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e293b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Doctor</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Save size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <ImageCropPicker
            onImageSelected={handleProfilePhotoSelected}
            aspectRatio={[1, 1]}
            circular={true}
            width={400}
            height={400}
            showControls={true}
            initialImage={profilePhotoUri || profilePhoto}
          />
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <InputField
            label="Name *"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            placeholder="Enter name"
          />
          <InputField
            label="Email *"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            placeholder="Enter email"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Phone Number"
            value={formData.phone_number}
            onChangeText={(text) => setFormData({ ...formData, phone_number: text })}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
          />
          <InputField
            label="Current Location"
            value={formData.current_location}
            onChangeText={(text) => setFormData({ ...formData, current_location: text })}
            placeholder="Enter current location"
          />
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>

          
          <InputField
            label="Qualifications"
            value={formData.qualifications}
            onChangeText={(text) => setFormData({ ...formData, qualifications: text })}
            placeholder="Enter qualifications"
          />
          <InputField
            label="Experience"
            value={formData.experience}
            onChangeText={(text) => setFormData({ ...formData, experience: text })}
            placeholder="Enter experience"
          />
          <InputField
            label="Medical Council Reg No"
            value={formData.medical_council_reg_no}
            onChangeText={(text) => setFormData({ ...formData, medical_council_reg_no: text })}
            placeholder="Enter registration number"
          />
          <InputField
            label="Current Hospital"
            value={formData.current_hospital}
            onChangeText={(text) => setFormData({ ...formData, current_hospital: text })}
            placeholder="Enter current hospital"
          />
          <InputField
            label="Preferred Work Type"
            value={formData.preferred_work_type}
            onChangeText={(text) => setFormData({ ...formData, preferred_work_type: text })}
            placeholder="Enter preferred work type"
          />
          <InputField
            label="Preferred Location"
            value={formData.preferred_location}
            onChangeText={(text) => setFormData({ ...formData, preferred_location: text })}
            placeholder="Enter preferred location"
          />
          <View style={styles.textAreaContainer}>
            <Text style={styles.label}>Professional Achievements</Text>
            <TextInput
              style={styles.textArea}
              value={formData.professional_achievements}
              onChangeText={(text) => setFormData({ ...formData, professional_achievements: text })}
              placeholder="Enter professional achievements"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize }: any) {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: -0.3,
  },
  saveButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: -0.3,
  },
  photoContainer: {
    alignItems: 'center',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  profilePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  changePhotoText: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#fff',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  textAreaContainer: {
    marginBottom: 16,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#fff',
    minHeight: 100,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  fileSizeHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});


