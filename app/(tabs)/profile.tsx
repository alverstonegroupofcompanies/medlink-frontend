import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedButton } from '@/components/themed-button';
import { 
  Edit2, 
  Save, 
  X, 
  Camera, 
  FileText, 
  ArrowLeft, 
  User, 
  ShoppingCart, 
  Heart, 
  CreditCard, 
  Compass, 
  MapPin, 
  LogOut,
  ChevronRight,
  Briefcase,
  Award,
  FileCheck
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API from '../api';
import { router } from 'expo-router';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { getDoctorInfo, saveDoctorAuth } from '@/utils/auth';

export default function ProfileScreen() {
  const [doctor, setDoctor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{
    degree_certificate?: { uri: string; name: string; type: string };
    id_proof?: { uri: string; name: string; type: string };
    medical_registration_certificate?: { uri: string; name: string; type: string };
  }>({});

  useEffect(() => {
    loadDoctor();
  }, []);

  const loadDoctor = async () => {
    try {
      const info = await getDoctorInfo();
      if (info) {
        setDoctor(info);
        setFormData({
          name: info.name || '',
          email: info.email || '',
          phone_number: info.phone_number || '',
          current_location: info.current_location || '',
          professional_achievements: info.professional_achievements || '',
          medical_council_reg_no: info.medical_council_reg_no || '',
          qualifications: info.qualifications || '',
          specialization: info.specialization || '',
          experience: info.experience || '',
          current_hospital: info.current_hospital || '',
          preferred_work_type: info.preferred_work_type || '',
          preferred_location: info.preferred_location || '',
        });
        if (info.profile_photo) {
          setProfilePhotoUri(info.profile_photo);
        }
      }
    } catch (error) {
      console.error('Error loading doctor:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setProfilePhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handlePickDocument = async (field: string) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const match = /\.(\w+)$/.exec(result.assets[0].name);
        const type = match
          ? match[1] === 'pdf'
            ? 'application/pdf'
            : `image/${match[1]}`
          : 'application/pdf';
        setDocuments((prev) => ({
          ...prev,
          [field]: {
            uri: result.assets[0].uri,
            name: result.assets[0].name,
            type,
          },
        }));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.email?.trim()) {
      Alert.alert('Error', 'Name and Email are required');
      return;
    }

    setLoading(true);
    try {
      const data = new FormData();

      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          data.append(key, String(value));
        }
      });

      // Add profile photo if selected
      if (profilePhotoUri && !profilePhotoUri.startsWith('http')) {
        const filename = profilePhotoUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        data.append('profile_photo', {
          uri: profilePhotoUri,
          name: filename,
          type,
        } as any);
      }

      // Add documents if selected
      Object.entries(documents).forEach(([key, file]) => {
        if (file) {
          data.append(key, {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
        }
      });

      const response = await API.post('/doctor/update-profile', data);

      if (response.data?.doctor) {
        // Update doctor info in storage using centralized function
        const token = await AsyncStorage.getItem('doctorToken');
        if (token) {
          await saveDoctorAuth(token, response.data.doctor);
        } else {
          // If no token, just update the info (shouldn't happen, but safety check)
          await AsyncStorage.setItem('doctorInfo', JSON.stringify(response.data.doctor));
        }
        
        setDoctor(response.data.doctor);
        setIsEditing(false);
        
        // Calculate and show new completion percentage
        const completion = calculateProfileCompletion(response.data.doctor);
        const percentage = Math.round(completion * 100);
        
        Alert.alert(
          'Success',
          `Profile updated successfully!\nProfile Status: ${percentage}%`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Don't navigate back - stay on profile screen to see updated data
                setIsEditing(false);
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Update error:', error.response?.data || error.message);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to update profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    loadDoctor();
    setDocuments({});
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const renderField = (
    label: string,
    field: string,
    multiline: boolean = false,
    keyboardType: string = 'default'
  ) => {
    const value = formData[field] || '';
    return (
      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, multiline && styles.textArea]}
            value={value}
            onChangeText={(text) => updateField(field, text)}
            multiline={multiline}
            numberOfLines={multiline ? 4 : 1}
            keyboardType={keyboardType as any}
            placeholder={`Enter ${label.toLowerCase()}`}
            placeholderTextColor="#999"
          />
        ) : (
          <Text style={styles.fieldValue}>{value || 'Not provided'}</Text>
        )}
      </View>
    );
  };

  const profileCompletion = doctor ? Math.round(calculateProfileCompletion(doctor) * 100) : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.profileImageContainer}>
          <Image
            source={{
              uri: profilePhotoUri || doctor?.profile_photo || 'https://i.pravatar.cc/150?img=1',
            }}
            style={styles.topProfileImage}
          />
        </View>
        
        <TouchableOpacity
          style={styles.editIconButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Edit2 size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Text style={styles.profileName}>
            {doctor?.name || 'Doctor Name'}
          </Text>
          <Text style={styles.profileLocation}>
            {doctor?.current_location || 'Location not set'}
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryCards}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Profile</Text>
            <Text style={styles.summaryValue}>{profileCompletion}%</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Applications</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Active Jobs</Text>
            <Text style={styles.summaryValue}>0</Text>
          </View>
        </View>

        {/* Menu List */}
        <View style={styles.menuList}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              if (isEditing) {
                // Show personal information edit
                Alert.alert('Personal Information', 'Edit your personal details');
              }
            }}
          >
            <View style={styles.menuItemLeft}>
              <User size={22} color={PrimaryColors.main} />
              <Text style={styles.menuItemText}>Personal Information</Text>
            </View>
            <ChevronRight size={20} color={NeutralColors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              if (isEditing) {
                Alert.alert('Professional Details', 'Edit your professional information');
              }
            }}
          >
            <View style={styles.menuItemLeft}>
              <Briefcase size={22} color={PrimaryColors.main} />
              <Text style={styles.menuItemText}>Professional Details</Text>
            </View>
            <ChevronRight size={20} color={NeutralColors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              if (isEditing) {
                Alert.alert('Documents', 'Manage your documents');
              }
            }}
          >
            <View style={styles.menuItemLeft}>
              <FileCheck size={22} color={PrimaryColors.main} />
              <Text style={styles.menuItemText}>Documents</Text>
            </View>
            <ChevronRight size={20} color={NeutralColors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Job Applications', 'View your job applications');
            }}
          >
            <View style={styles.menuItemLeft}>
              <ShoppingCart size={22} color={PrimaryColors.main} />
              <Text style={styles.menuItemText}>Job Applications</Text>
            </View>
            <ChevronRight size={20} color={NeutralColors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              Alert.alert('Settings', 'App settings');
            }}
          >
            <View style={styles.menuItemLeft}>
              <Award size={22} color={PrimaryColors.main} />
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <ChevronRight size={20} color={NeutralColors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              router.push('/(tabs)/more');
            }}
          >
            <View style={styles.menuItemLeft}>
              <LogOut size={22} color={StatusColors.error} />
              <Text style={[styles.menuItemText, { color: StatusColors.error }]}>Logout</Text>
            </View>
            <ChevronRight size={20} color={NeutralColors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Edit Mode - Show Form Fields */}
        {isEditing && (
          <View style={styles.editSection}>
            <View style={styles.editHeader}>
              <Text style={styles.editTitle}>Edit Profile</Text>
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.cancelButton]}
                  onPress={handleCancel}
                >
                  <X size={18} color={StatusColors.error} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editActionButton, styles.saveButton]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Save size={18} color="#fff" />
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Profile Photo Edit */}
            <View style={styles.profilePhotoEditSection}>
              <Image
                source={{
                  uri: profilePhotoUri || doctor?.profile_photo || 'https://i.pravatar.cc/150?img=1',
                }}
                style={styles.editProfileImage}
              />
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handlePickImage}
              >
                <Camera size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Basic Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Details</Text>
              {renderField('Full Name', 'name')}
              {renderField('Email', 'email', false, 'email-address')}
              {renderField('Phone Number', 'phone_number', false, 'phone-pad')}
              {renderField('Current Location', 'current_location')}
            </View>

            {/* Professional Details Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Details</Text>
              {renderField('Professional Achievements', 'professional_achievements', true)}
              {renderField('Medical Council Registration Number', 'medical_council_reg_no')}
              {renderField('Qualifications', 'qualifications')}
              {renderField('Specialization', 'specialization')}
              {renderField('Experience', 'experience')}
              {renderField('Current Hospital', 'current_hospital')}
              {renderField('Preferred Work Type', 'preferred_work_type')}
              {renderField('Preferred Location', 'preferred_location')}
            </View>

            {/* Documents Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handlePickDocument('degree_certificate')}
              >
                <FileText size={20} color={PrimaryColors.main} />
                <Text style={styles.documentButtonText}>
                  {documents.degree_certificate
                    ? documents.degree_certificate.name
                    : 'Upload Degree Certificate'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handlePickDocument('id_proof')}
              >
                <FileText size={20} color={PrimaryColors.main} />
                <Text style={styles.documentButtonText}>
                  {documents.id_proof ? documents.id_proof.name : 'Upload ID Proof'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handlePickDocument('medical_registration_certificate')}
              >
                <FileText size={20} color={PrimaryColors.main} />
                <Text style={styles.documentButtonText}>
                  {documents.medical_registration_certificate
                    ? documents.medical_registration_certificate.name
                    : 'Upload Medical Registration Certificate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PrimaryColors.dark,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  // Top Bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: PrimaryColors.dark,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  topProfileImage: {
    width: '100%',
    height: '100%',
  },
  editIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: PrimaryColors.dark,
    paddingBottom: 32,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  profileLocation: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  // Summary Cards
  summaryCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 24,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryLabel: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  // Menu List
  menuList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: NeutralColors.textPrimary,
  },
  // Edit Section
  editSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: NeutralColors.background,
    marginTop: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#FFE5E5',
  },
  cancelButtonText: {
    color: StatusColors.error,
    fontWeight: '600',
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: StatusColors.success,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  profilePhotoEditSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  editProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: PrimaryColors.main,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  section: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.main,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
    paddingBottom: 8,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    minHeight: 40,
  },
  input: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: 40,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  documentButtonText: {
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '600',
    flex: 1,
  },
});
