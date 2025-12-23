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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Edit2, 
  Save, 
  X, 
  Camera, 
  FileText, 
  User, 
  Mail, 
  Phone, 
  MapPin,
  Briefcase,
  Award,
  GraduationCap,
  Building2,
  Clock,
  CheckCircle,
  Upload,
  Eye,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API from '../api';
import { router, useFocusEffect } from 'expo-router';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { ModernColors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/modern-theme';
import { getDoctorInfo, saveDoctorAuth, getProfilePhotoUrl } from '@/utils/auth';
import { ModernCard } from '@/components/modern-card';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const [doctor, setDoctor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [originalProfilePhotoUri, setOriginalProfilePhotoUri] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const safeBottomPadding = useSafeBottomPadding();
  const [documents, setDocuments] = useState<{
    degree_certificate?: { uri: string; name: string; type: string };
    id_proof?: { uri: string; name: string; type: string };
    medical_registration_certificate?: { uri: string; name: string; type: string };
  }>({});

  useEffect(() => {
    loadDoctor();
    loadDepartments();
  }, []);

  // Reload profile when screen comes into focus to get fresh departments data
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Profile screen focused - reloading doctor data');
      loadDoctor();
    }, [])
  );

  const loadDepartments = async () => {
    try {
      const response = await API.get('/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadDoctor = async () => {
    try {
      // Always load fresh data from API to get latest departments
      try {
        const response = await API.get('/doctor/profile');
        console.log('📋 Full API response:', JSON.stringify(response.data, null, 2));
        if (response.data?.doctor) {
          const doctorData = response.data.doctor;
          
          // Log departments for debugging
          console.log('📋 Raw API departments data:', JSON.stringify(doctorData.departments, null, 2));
          console.log('📋 Departments count:', doctorData.departments?.length || 0);
          console.log('📋 doctorData keys:', Object.keys(doctorData));
          
          setDoctor(doctorData);
          
          // Save fresh data to storage
          const token = await AsyncStorage.getItem('doctorToken');
          if (token) {
            await saveDoctorAuth(token, doctorData);
          }
          
          
          setFormData({
            name: doctorData.name || '',
            email: doctorData.email || '',
            phone_number: doctorData.phone_number || '',
            current_location: doctorData.current_location || '',
            professional_achievements: doctorData.professional_achievements || '',
            medical_council_reg_no: doctorData.medical_council_reg_no || '',
            qualifications: doctorData.qualifications || '',
            department_id: doctorData.department_id || '',
            experience: doctorData.experience || '',
            current_hospital: doctorData.current_hospital || '',
            preferred_work_type: doctorData.preferred_work_type || '',
            preferred_location: doctorData.preferred_location || '',
          });
          
          if (doctorData.profile_photo) {
            const photoUrl = getProfilePhotoUrl(doctorData);
            setProfilePhotoUri(photoUrl);
            setOriginalProfilePhotoUri(photoUrl);
          }
          return;
        }
      } catch (apiError) {
        console.log('⚠️ API fetch failed, using cached data:', apiError);
        console.error('API Error details:', apiError);
      }
      
      // Fallback to cached data (but this should not have departments if API is working)
      const info = await getDoctorInfo();
      if (info) {
        console.log('📋 Using cached doctor data, departments:', info.departments?.length || 0);
        setDoctor(info);
        
        setFormData({
          name: info.name || '',
          email: info.email || '',
          phone_number: info.phone_number || '',
          current_location: info.current_location || '',
          professional_achievements: info.professional_achievements || '',
          medical_council_reg_no: info.medical_council_reg_no || '',
          qualifications: info.qualifications || '',
          department_id: info.department_id || '',
          experience: info.experience || '',
          current_hospital: info.current_hospital || '',
          preferred_work_type: info.preferred_work_type || '',
          preferred_location: info.preferred_location || '',
        });
        if (info.profile_photo) {
          const photoUrl = getProfilePhotoUrl(info);
          setProfilePhotoUri(photoUrl);
          setOriginalProfilePhotoUri(photoUrl);
        }
      }
    } catch (error) {
      console.error('Error loading doctor:', error);
    }
  };

  const handlePickImage = async () => {
    try {
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

        setProfilePhotoUri(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
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

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'profile_photo' || key === 'degree_certificate' || key === 'id_proof' || key === 'medical_registration_certificate') {
          return;
        }
        if (value) {
          if (key === 'department_id') {
            console.log('📋 Sending department_id:', value);
          }
          data.append(key, String(value));
        }
      });

      // Only send profile photo if it's a new local file (different from original)
      // Check if it's a local file: file://, content://, or not http/https
      const isLocalFile = profilePhotoUri && (
        profilePhotoUri.startsWith('file://') || 
        profilePhotoUri.startsWith('content://') ||
        (!profilePhotoUri.startsWith('http://') && !profilePhotoUri.startsWith('https://'))
      );
      
      const photoChanged = profilePhotoUri && profilePhotoUri !== originalProfilePhotoUri;
      
      if (photoChanged && isLocalFile) {
        const filename = profilePhotoUri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        console.log('📤 Sending new profile photo:', filename, 'URI:', profilePhotoUri.substring(0, 50) + '...');
        data.append('profile_photo', {
          uri: profilePhotoUri,
          name: filename,
          type,
        } as any);
      } else if (photoChanged) {
        console.log('⚠️ Profile photo URI changed but is not a local file:', profilePhotoUri?.substring(0, 50));
      } else {
        console.log('ℹ️ Profile photo unchanged, skipping upload');
      }

      Object.entries(documents).forEach(([key, file]) => {
        if (file && file.uri && !file.uri.startsWith('http') && !file.uri.startsWith('https')) {
          data.append(key, {
            uri: file.uri,
            name: file.name,
            type: file.type,
          } as any);
        }
      });

      const response = await API.post('/doctor/update-profile', data);

      if (response.data?.doctor) {
        const token = await AsyncStorage.getItem('doctorToken');
        const updatedDoctor = response.data.doctor;
        
        if (token) {
          await saveDoctorAuth(token, updatedDoctor);
        } else {
          await AsyncStorage.setItem('doctorInfo', JSON.stringify(updatedDoctor));
        }
        
        setDoctor(updatedDoctor);
        
        // Update profile photo URI with the full URL from response
        if (updatedDoctor.profile_photo) {
          const newPhotoUrl = getProfilePhotoUrl(updatedDoctor);
          console.log('✅ Profile photo updated:', newPhotoUrl);
          setProfilePhotoUri(newPhotoUrl);
          setOriginalProfilePhotoUri(newPhotoUrl);
        }
        
        setIsEditing(false);
        
        // Reload doctor data to get fresh departments data with proper relationships
        await loadDoctor();
        
        const completion = calculateProfileCompletion(response.data.doctor);
        const percentage = Math.round(completion * 100);
        
        Alert.alert(
          'Success',
          `Profile updated successfully!\nProfile Status: ${percentage}%`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Update error:', error.response?.data || error.message);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });
      
      let errorMessage = 'Failed to update profile';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle validation errors
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join('\n');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(
        'Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset profile photo to original
    if (originalProfilePhotoUri) {
      setProfilePhotoUri(originalProfilePhotoUri);
    }
    loadDoctor();
    setDocuments({});
  };

  const updateField = (field: string, value: string | number | null) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const profileCompletion = doctor ? Math.round(calculateProfileCompletion(doctor) * 100) : 0;

  return (
    <ScreenSafeArea 
      backgroundColor={ModernColors.primary.main} 
      excludeBottom={true}
      statusBarStyle="light-content"
    >
      <View style={styles.container}>
        
        {/* Modern Header with Gradient */}
        <LinearGradient
          colors={ModernColors.primary.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerActions}>
              {!isEditing ? (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => setIsEditing(true)}
                >
                  <Edit2 size={20} color={ModernColors.primary.main} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                >
                  <X size={20} color={ModernColors.error.main} />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Card */}
          <ModernCard variant="elevated" style={styles.profileCard}>
            <View style={styles.profileImageSection}>
              <View style={styles.profileImageContainer}>
                <Image
                  key={profilePhotoUri || getProfilePhotoUrl(doctor)}
                  source={{
                    uri: profilePhotoUri || getProfilePhotoUrl(doctor),
                  }}
                  style={styles.profileImage}
                />
                {isEditing && (
                  <TouchableOpacity
                    style={styles.cameraIconButton}
                    onPress={handlePickImage}
                  >
                    <Camera size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {doctor?.name || 'Doctor Name'}
                </Text>
                {doctor?.current_location && (
                  <View style={styles.locationRow}>
                    <MapPin size={14} color={ModernColors.text.secondary} />
                    <Text style={styles.locationText}>
                      {doctor.current_location}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Profile Completion */}
            <View style={styles.completionSection}>
              <View style={styles.completionHeader}>
                <Text style={styles.completionLabel}>Profile Completion</Text>
                <Text style={styles.completionPercentage}>{profileCompletion}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${profileCompletion}%` }
                  ]} 
                />
              </View>
            </View>
          </ModernCard>

          {!isEditing ? (
            /* View Mode */
            <>
              {/* Contact Information */}
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <User size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                </View>
                <View style={styles.detailRow}>
                  <Mail size={18} color={ModernColors.text.secondary} />
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{doctor?.email || 'Not provided'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Phone size={18} color={ModernColors.text.secondary} />
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{doctor?.phone_number || 'Not provided'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={18} color={ModernColors.text.secondary} />
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{doctor?.current_location || 'Not provided'}</Text>
                </View>
              </ModernCard>

              {/* Professional Details */}
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Briefcase size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Professional Details</Text>
                </View>

                {doctor?.department && (
                  <View style={styles.detailRow}>
                    <Briefcase size={18} color={ModernColors.text.secondary} />
                    <Text style={styles.detailLabel}>Department</Text>
                    <Text style={styles.detailValue}>{doctor.department.name || doctor.department}</Text>
                  </View>
                )}

                {doctor?.qualifications && (
                  <View style={styles.detailRow}>
                    <GraduationCap size={18} color={ModernColors.text.secondary} />
                    <Text style={styles.detailLabel}>Qualifications</Text>
                    <Text style={styles.detailValue}>{doctor.qualifications}</Text>
                  </View>
                )}
                {doctor?.experience && (
                  <View style={styles.detailRow}>
                    <Clock size={18} color={ModernColors.text.secondary} />
                    <Text style={styles.detailLabel}>Experience</Text>
                    <Text style={styles.detailValue}>{doctor.experience}</Text>
                  </View>
                )}
                {doctor?.current_hospital && (
                  <View style={styles.detailRow}>
                    <Building2 size={18} color={ModernColors.text.secondary} />
                    <Text style={styles.detailLabel}>Current Hospital</Text>
                    <Text style={styles.detailValue}>{doctor.current_hospital}</Text>
                  </View>
                )}
                {doctor?.medical_council_reg_no && (
                  <View style={styles.detailRow}>
                    <Award size={18} color={ModernColors.text.secondary} />
                    <Text style={styles.detailLabel}>Registration No.</Text>
                    <Text style={styles.detailValue}>{doctor.medical_council_reg_no}</Text>
                  </View>
                )}
                {doctor?.preferred_work_type && (
                  <View style={styles.detailRow}>
                    <Briefcase size={18} color={ModernColors.text.secondary} />
                    <Text style={styles.detailLabel}>Preferred Work Type</Text>
                    <Text style={styles.detailValue}>{doctor.preferred_work_type}</Text>
                  </View>
                )}
                {doctor?.professional_achievements && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Achievements</Text>
                    <Text style={styles.detailValue}>{doctor.professional_achievements}</Text>
                  </View>
                )}
              </ModernCard>

              {/* Documents */}
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <FileText size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Documents</Text>
                </View>
                <View style={styles.documentList}>
                  {doctor?.degree_certificate ? (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.success.main} />
                      <Text style={styles.documentText}>Degree Certificate</Text>
                      <CheckCircle size={16} color={ModernColors.success.main} />
                    </View>
                  ) : (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.text.tertiary} />
                      <Text style={[styles.documentText, styles.documentTextMissing]}>Degree Certificate</Text>
                    </View>
                  )}
                  {doctor?.id_proof ? (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.success.main} />
                      <Text style={styles.documentText}>ID Proof</Text>
                      <CheckCircle size={16} color={ModernColors.success.main} />
                    </View>
                  ) : (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.text.tertiary} />
                      <Text style={[styles.documentText, styles.documentTextMissing]}>ID Proof</Text>
                    </View>
                  )}
                  {doctor?.medical_registration_certificate ? (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.success.main} />
                      <Text style={styles.documentText}>Medical Registration</Text>
                      <CheckCircle size={16} color={ModernColors.success.main} />
                    </View>
                  ) : (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.text.tertiary} />
                      <Text style={[styles.documentText, styles.documentTextMissing]}>Medical Registration</Text>
                    </View>
                  )}
                </View>
              </ModernCard>
            </>
          ) : (
            /* Edit Mode */
            <>
              {/* Basic Details */}
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <Text style={styles.editSectionTitle}>Basic Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(text) => updateField('name', text)}
                    placeholder="Enter your full name"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.email}
                    onChangeText={(text) => updateField('email', text)}
                    keyboardType="email-address"
                    placeholder="Enter your email"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.phone_number}
                    onChangeText={(text) => updateField('phone_number', text)}
                    keyboardType="phone-pad"
                    placeholder="Enter your phone number"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Location</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.current_location}
                    onChangeText={(text) => updateField('current_location', text)}
                    placeholder="Enter your location"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
              </ModernCard>

              {/* Professional Details */}
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <Text style={styles.editSectionTitle}>Professional Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Department</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => {
                      Alert.alert(
                        'Select Department',
                        'Choose your department',
                        [
                          { text: 'None', onPress: () => updateField('department_id', '') },
                          ...departments.map((dept: any) => ({
                            text: dept.name,
                            onPress: () => updateField('department_id', dept.id),
                          })),
                          { text: 'Cancel', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <Text style={{ color: formData.department_id ? ModernColors.text.primary : ModernColors.text.tertiary }}>
                      {formData.department_id  
                        ? departments.find((d: any) => d.id === formData.department_id)?.name || 'Select department...'
                        : 'Select department...'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Qualifications</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.qualifications}
                    onChangeText={(text) => updateField('qualifications', text)}
                    placeholder="e.g., MBBS, MD, etc."
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Experience</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.experience}
                    onChangeText={(text) => updateField('experience', text)}
                    placeholder="e.g., 5 years"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Hospital</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.current_hospital}
                    onChangeText={(text) => updateField('current_hospital', text)}
                    placeholder="Enter current hospital"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Medical Council Registration No.</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.medical_council_reg_no}
                    onChangeText={(text) => updateField('medical_council_reg_no', text)}
                    placeholder="Enter registration number"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Preferred Work Type</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.preferred_work_type}
                    onChangeText={(text) => updateField('preferred_work_type', text)}
                    placeholder="e.g., full-time, part-time"
                    placeholderTextColor={ModernColors.text.tertiary}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Professional Achievements</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={formData.professional_achievements}
                    onChangeText={(text) => updateField('professional_achievements', text)}
                    multiline
                    numberOfLines={4}
                    placeholder="Describe your achievements"
                    placeholderTextColor={ModernColors.text.tertiary}
                    textAlignVertical="top"
                  />
                </View>
              </ModernCard>

              {/* Documents */}
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <Text style={styles.editSectionTitle}>Documents</Text>
                
                {/* Degree Certificate */}
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>Degree Certificate</Text>
                  {(documents.degree_certificate || doctor?.degree_certificate) ? (
                    <View style={styles.documentPreview}>
                      <View style={styles.documentPreviewInfo}>
                        <FileText size={20} color={ModernColors.success.main} />
                        <View style={styles.documentPreviewText}>
                          <Text style={styles.documentPreviewName}>
                            {documents.degree_certificate?.name || 'Degree Certificate.pdf'}
                          </Text>
                          <Text style={styles.documentPreviewStatus}>Uploaded</Text>
                        </View>
                      </View>
                      <View style={styles.documentActions}>
                        {doctor?.degree_certificate && (
                          <TouchableOpacity
                            style={styles.documentViewButton}
                            onPress={() => {
                              if (doctor.degree_certificate) {
                                // Open document URL
                                Alert.alert('View Document', 'Document will open in browser');
                              }
                            }}
                          >
                            <Eye size={16} color={ModernColors.primary.main} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.documentRemoveButton}
                          onPress={() => {
                            setDocuments(prev => {
                              const newDocs = { ...prev };
                              delete newDocs.degree_certificate;
                              return newDocs;
                            });
                          }}
                        >
                          <X size={16} color={ModernColors.error.main} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.documentUploadButton}
                      onPress={() => handlePickDocument('degree_certificate')}
                    >
                      <Upload size={18} color={ModernColors.primary.main} />
                      <Text style={styles.documentUploadText}>Upload Degree Certificate</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* ID Proof */}
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>ID Proof</Text>
                  {(documents.id_proof || doctor?.id_proof) ? (
                    <View style={styles.documentPreview}>
                      <View style={styles.documentPreviewInfo}>
                        <FileText size={20} color={ModernColors.success.main} />
                        <View style={styles.documentPreviewText}>
                          <Text style={styles.documentPreviewName}>
                            {documents.id_proof?.name || 'ID Proof.pdf'}
                          </Text>
                          <Text style={styles.documentPreviewStatus}>Uploaded</Text>
                        </View>
                      </View>
                      <View style={styles.documentActions}>
                        {doctor?.id_proof && (
                          <TouchableOpacity
                            style={styles.documentViewButton}
                            onPress={() => {
                              if (doctor.id_proof) {
                                Alert.alert('View Document', 'Document will open in browser');
                              }
                            }}
                          >
                            <Eye size={16} color={ModernColors.primary.main} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.documentRemoveButton}
                          onPress={() => {
                            setDocuments(prev => {
                              const newDocs = { ...prev };
                              delete newDocs.id_proof;
                              return newDocs;
                            });
                          }}
                        >
                          <X size={16} color={ModernColors.error.main} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.documentUploadButton}
                      onPress={() => handlePickDocument('id_proof')}
                    >
                      <Upload size={18} color={ModernColors.primary.main} />
                      <Text style={styles.documentUploadText}>Upload ID Proof</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Medical Registration Certificate */}
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>Medical Registration Certificate</Text>
                  {(documents.medical_registration_certificate || doctor?.medical_registration_certificate) ? (
                    <View style={styles.documentPreview}>
                      <View style={styles.documentPreviewInfo}>
                        <FileText size={20} color={ModernColors.success.main} />
                        <View style={styles.documentPreviewText}>
                          <Text style={styles.documentPreviewName}>
                            {documents.medical_registration_certificate?.name || 'Medical Registration.pdf'}
                          </Text>
                          <Text style={styles.documentPreviewStatus}>Uploaded</Text>
                        </View>
                      </View>
                      <View style={styles.documentActions}>
                        {doctor?.medical_registration_certificate && (
                          <TouchableOpacity
                            style={styles.documentViewButton}
                            onPress={() => {
                              if (doctor.medical_registration_certificate) {
                                Alert.alert('View Document', 'Document will open in browser');
                              }
                            }}
                          >
                            <Eye size={16} color={ModernColors.primary.main} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.documentRemoveButton}
                          onPress={() => {
                            setDocuments(prev => {
                              const newDocs = { ...prev };
                              delete newDocs.medical_registration_certificate;
                              return newDocs;
                            });
                          }}
                        >
                          <X size={16} color={ModernColors.error.main} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.documentUploadButton}
                      onPress={() => handlePickDocument('medical_registration_certificate')}
                    >
                      <Upload size={18} color={ModernColors.primary.main} />
                      <Text style={styles.documentUploadText}>Upload Medical Registration Certificate</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={styles.fileSizeHint}>
                  Maximum file size: 5MB (PDF, JPEG, PNG)
                </Text>
              </ModernCard>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={ModernColors.primary.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Save size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ModernColors.background.secondary,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  editButtonText: {
    ...Typography.captionBold,
    color: ModernColors.primary.main,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  cancelButtonText: {
    ...Typography.captionBold,
    color: ModernColors.error.main,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    // paddingBottom is now set dynamically using safeBottomPadding
  },
  profileCard: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
  },
  profileImageSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: Spacing.md,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ModernColors.neutral.gray200,
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraIconButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: ModernColors.primary.main,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Shadows.md,
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    ...Typography.h2,
    color: ModernColors.text.primary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  profileSpecialization: {
    ...Typography.body,
    color: ModernColors.text.secondary,
    marginBottom: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  locationText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  completionSection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: ModernColors.border.light,
  },
  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  completionLabel: {
    ...Typography.captionBold,
    color: ModernColors.text.secondary,
  },
  completionPercentage: {
    ...Typography.bodyBold,
    color: ModernColors.primary.main,
  },
  progressBar: {
    height: 8,
    backgroundColor: ModernColors.neutral.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ModernColors.primary.main,
    borderRadius: 4,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ModernColors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...Typography.h3,
    color: ModernColors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  detailLabel: {
    ...Typography.captionBold,
    color: ModernColors.text.secondary,
    minWidth: 100,
  },
  detailValue: {
    ...Typography.body,
    color: ModernColors.text.primary,
    flex: 1,
    textAlign: 'right',
  },
  detailSection: {
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  documentList: {
    gap: Spacing.sm,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  documentText: {
    ...Typography.body,
    color: ModernColors.text.primary,
    flex: 1,
  },
  documentTextMissing: {
    color: ModernColors.text.tertiary,
  },
  editSectionTitle: {
    ...Typography.h3,
    color: ModernColors.text.primary,
    marginBottom: Spacing.md,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    ...Typography.captionBold,
    color: ModernColors.text.primary,
    marginBottom: Spacing.xs,
  },
  input: {
    ...Typography.body,
    color: ModernColors.text.primary,
    backgroundColor: ModernColors.background.primary,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  textArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  documentSection: {
    marginBottom: Spacing.md,
  },
  documentLabel: {
    ...Typography.captionBold,
    color: ModernColors.text.primary,
    marginBottom: Spacing.xs,
  },
  documentUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: ModernColors.primary.light,
    borderWidth: 1,
    borderColor: ModernColors.primary.main,
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 56,
  },
  documentUploadText: {
    ...Typography.body,
    color: ModernColors.primary.main,
    flex: 1,
    fontWeight: '600',
  },
  documentPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ModernColors.success.light || '#F0FDF4',
    borderWidth: 1,
    borderColor: ModernColors.success.main,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 56,
  },
  documentPreviewInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  documentPreviewText: {
    flex: 1,
  },
  documentPreviewName: {
    ...Typography.body,
    color: ModernColors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  documentPreviewStatus: {
    ...Typography.caption,
    color: ModernColors.success.main,
    fontWeight: '500',
  },
  documentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  documentViewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ModernColors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentRemoveButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ModernColors.error.light || '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileSizeHint: {
    ...Typography.small,
    color: ModernColors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  departmentsList: {
    marginTop: Spacing.sm,
    marginLeft: 28,
  },
  departmentItem: {
    marginBottom: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  saveButtonText: {
    ...Typography.bodyBold,
    color: '#fff',
  },
});
