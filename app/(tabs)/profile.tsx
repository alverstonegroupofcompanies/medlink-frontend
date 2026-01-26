import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
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
  AlertCircle,
  Check,
  Landmark,
  CreditCard,
  Star,
  Wallet,
  ChevronRight,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import API from '../api';
import { API_BASE_URL } from '@/config/api';
import { router, useFocusEffect } from 'expo-router';
import { calculateProfileCompletion } from '@/utils/profileCompletion';
import { ModernColors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/modern-theme';
import { getDoctorInfo, saveDoctorAuth, getProfilePhotoUrl } from '@/utils/auth';
import { ModernCard } from '@/components/modern-card';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { BankingDetailsForm } from '@/components/BankingDetailsForm';

const { width } = Dimensions.get('window');
const IS_TABLET = width >= 768;
const CONTENT_MAX_WIDTH = 720;

export default function ProfileScreen() {
  const [doctor, setDoctor] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
  const [originalProfilePhotoUri, setOriginalProfilePhotoUri] = useState<string | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);
  const safeBottomPadding = useSafeBottomPadding();
  const [documents, setDocuments] = useState<{
    degree_certificate?: { uri: string; name: string; type: string };
    id_proof?: { uri: string; name: string; type: string };
    medical_registration_certificate?: { uri: string; name: string; type: string };
  }>({});
  const [bankingDetails, setBankingDetails] = useState<{
    bank_account_holder_name?: string;
    bank_account_number?: string;
    bank_ifsc_code?: string;
    bank_name?: string;
    bank_branch?: string;
    upi_id?: string;
    has_banking_details?: boolean;
  } | null>(null);
  const [showBankingForm, setShowBankingForm] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});

  useEffect(() => {
    loadDoctor();
    loadDepartments();
    loadBanking();
  }, []);

  // Reload profile when screen comes into focus to get fresh data (including profile photo updates)
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 Profile screen focused - reloading doctor data');
      loadDoctor();
      loadBanking();
    }, [])
  );

  const loadBanking = async () => {
    try {
      const r = await API.get('/doctor/banking-details');
      setBankingDetails(r.data?.banking_details ?? null);
    } catch (e) {
      console.error('Error loading banking details:', e);
      setBankingDetails(null);
    }
  };

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
          
          // Initialize selected departments
          if (doctorData.departments && Array.isArray(doctorData.departments) && doctorData.departments.length > 0) {
            setSelectedDepartmentIds(doctorData.departments.map((d: any) => d.id));
          } else if (doctorData.department_id) {
            setSelectedDepartmentIds([doctorData.department_id]);
          } else {
            setSelectedDepartmentIds([]);
          }
          
          if (doctorData.profile_photo) {
            // Add cache busting timestamp to force image reload
            const photoUrl = getProfilePhotoUrl(doctorData);
            const cacheBustedUrl = photoUrl.includes('?') 
              ? photoUrl.split('?')[0] + '?t=' + Date.now()
              : photoUrl + '?t=' + Date.now();
            setProfilePhotoUri(cacheBustedUrl);
            setOriginalProfilePhotoUri(cacheBustedUrl);
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

        // Initialize selected departments from cache
        if (info.departments && Array.isArray(info.departments) && info.departments.length > 0) {
            setSelectedDepartmentIds(info.departments.map((d: any) => d.id));
        } else if (info.department_id) {
            setSelectedDepartmentIds([info.department_id]);
        }
        
        if (info.profile_photo) {
          // Add cache busting for cached data too
          const photoUrl = getProfilePhotoUrl(info);
          const cacheBustedUrl = photoUrl.includes('?') 
            ? photoUrl.split('?')[0] + '?t=' + Date.now()
            : photoUrl + '?t=' + Date.now();
          setProfilePhotoUri(cacheBustedUrl);
          setOriginalProfilePhotoUri(cacheBustedUrl);
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
      // Prepare department IDs JSON first
      const departmentIdsJson = JSON.stringify(selectedDepartmentIds);
      
      const data = new FormData();

      // Append all form fields except file fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'profile_photo' || key === 'degree_certificate' || key === 'id_proof' || key === 'medical_registration_certificate') {
          return;
        }
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'department_id') {
            console.log('📋 Sending department_id:', value);
          }
          data.append(key, String(value));
        }
      });
      
      // Append selected department IDs as JSON string for robust handling
      // This ensures empty arrays are sent correctly and bypasses some FormData array quirks
      // Always append, even if empty array, so backend knows departments were updated
      console.log('📋 Sending department_ids_json:', departmentIdsJson, 'Selected IDs:', selectedDepartmentIds);
      data.append('department_ids_json', departmentIdsJson);

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

      // Log FormData contents for debugging (in development only)
      if (__DEV__) {
        console.log('📤 Preparing to send FormData with fields:', {
          name: formData.name,
          email: formData.email,
          department_ids_json: departmentIdsJson,
          selectedDepartmentIds: selectedDepartmentIds,
          hasProfilePhoto: photoChanged && isLocalFile,
          documentsCount: Object.keys(documents).length,
        });
      }

      // Use fetch API for FormData - more reliable than Axios in React Native
      try {
        // Add retry logic for network errors
        let lastError: any = null;
        const maxRetries = 2;
        let responseData: any = null;
        const token = await AsyncStorage.getItem('doctorToken');
        const url = `${API_BASE_URL}/doctor/update-profile`;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              // Wait before retry (exponential backoff)
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              console.log(`🔄 Retrying profile update (attempt ${attempt + 1}/${maxRetries + 1}) after ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            // Use AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds
            
            try {
              const response = await fetch(url, {
                method: 'POST',
                body: data, // FormData - don't set Content-Type, fetch handles it
                headers: {
                  'Accept': 'application/json',
                  ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                  // Don't set Content-Type - let fetch handle it automatically for FormData
                },
                signal: controller.signal,
              });
              
              clearTimeout(timeoutId);
              
              // Parse response
              responseData = await response.json();
              
              // Check if response is ok
              if (!response.ok) {
                // Don't retry on validation errors (4xx)
                if (response.status >= 400 && response.status < 500) {
                  throw {
                    response: {
                      status: response.status,
                      data: responseData,
                    },
                    message: responseData?.message || 'Validation failed',
                  };
                }
                
                // Retry on server errors (5xx)
                if (response.status >= 500 && attempt < maxRetries) {
                  console.warn(`⚠️ Server error ${response.status} on attempt ${attempt + 1}, will retry...`);
                  continue;
                }
                
                throw {
                  response: {
                    status: response.status,
                    data: responseData,
                  },
                  message: responseData?.message || 'Server error',
                };
              }
              
              // Success - break out of retry loop
              break;
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              
              // Handle AbortError (timeout)
              if (fetchError.name === 'AbortError') {
                throw {
                  code: 'ETIMEDOUT',
                  message: 'Request timeout',
                };
              }
              
              throw fetchError;
            }
          } catch (retryError: any) {
            lastError = retryError;
            
            // Only retry on network errors, not validation errors
            if (retryError.response) {
              const status = retryError.response.status;
              // Don't retry validation/authentication errors (4xx)
              if (status >= 400 && status < 500) {
                throw retryError;
              }
              // Allow retry for server errors (5xx) - these are transient
              if (status >= 500 && attempt < maxRetries) {
                console.warn(`⚠️ Server error ${status} on attempt ${attempt + 1}, will retry...`);
                continue;
              }
              throw retryError;
            }
            
            // Network error - retry if we have attempts left
            if (attempt < maxRetries && (
              retryError.code === 'ERR_NETWORK' ||
              retryError.code === 'ECONNREFUSED' ||
              retryError.code === 'ETIMEDOUT' ||
              retryError.name === 'AbortError' ||
              retryError.message?.includes('Network') ||
              retryError.message?.includes('timeout')
            )) {
              console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry...`);
              continue;
            } else {
              // No more retries or non-retryable error
              throw retryError;
            }
          }
        }
        
        if (!responseData) {
          throw lastError || new Error('Failed to update profile after retries');
        }

        if (responseData?.doctor) {
          const token = await AsyncStorage.getItem('doctorToken');
          const updatedDoctor = responseData.doctor;
          
          if (token) {
            await saveDoctorAuth(token, updatedDoctor);
          } else {
            await AsyncStorage.setItem('doctorInfo', JSON.stringify(updatedDoctor));
          }
          
          setDoctor(updatedDoctor);
          
          // Immediately update profile photo URI from response with cache-busting
          if (updatedDoctor.profile_photo) {
            const photoUrl = getProfilePhotoUrl(updatedDoctor);
            const cacheBustedUrl = photoUrl.includes('?') 
              ? photoUrl.split('?')[0] + '?t=' + Date.now()
              : photoUrl + '?t=' + Date.now();
            setProfilePhotoUri(cacheBustedUrl);
            setOriginalProfilePhotoUri(cacheBustedUrl);
          } else {
            // Clear if no photo
            setProfilePhotoUri(null);
            setOriginalProfilePhotoUri(null);
          }
          
          setIsEditing(false);
          
          // Force reload doctor data from API to get fresh data
          // Add small delay to ensure backend has processed the update
          setTimeout(async () => {
            await loadDoctor();
          }, 500);
          
          const completion = calculateProfileCompletion(responseData.doctor);
          const percentage = Math.round(completion * 100);
          
          // Set loading to false BEFORE showing alert for immediate UI feedback
          setLoading(false);
          
          Alert.alert(
            'Success',
            `Profile updated successfully!\nProfile Status: ${percentage}%`,
            [{ text: 'OK' }]
          );
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (requestError: any) {
        // Re-throw to be caught by outer catch block
        throw requestError;
      }
    } catch (error: any) {
      console.error('Update error:', error.response?.data || error.message);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        code: error.code,
        baseURL: error.config?.baseURL,
      });
      
      let errorMessage = 'Failed to update profile';
      let showRetry = false;
      
      // Check for network errors
      if (!error.response) {
        // Network error - no response from server
        const baseUrl = error.config?.baseURL || 'server';
        const endpoint = error.config?.url || '/doctor/update-profile';
        const fullUrl = `${baseUrl}${endpoint}`;
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || 
            error.message?.includes('Network Error') || 
            error.message?.includes('Network request failed') ||
            error.message?.includes('Unable to connect')) {
          errorMessage = `Unable to connect to server.\n\nTrying to reach: ${fullUrl}\n\nPlease check:\n1. Your internet connection\n2. Backend server is running\n3. Server URL is correct\n\nIf this persists, the server may be temporarily unavailable.`;
          showRetry = true;
        } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
          errorMessage = 'Request timed out. The file may be too large or connection is slow. Please try again with a smaller file or check your connection speed.';
          showRetry = true;
        } else {
          errorMessage = `${error.message || 'Network error'}\n\nEndpoint: ${fullUrl}\n\nPlease check your connection and try again.`;
          showRetry = true;
        }
      } else if (error.response?.data?.message) {
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
        errorMessage,
        showRetry ? [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSave() }
        ] : [{ text: 'OK' }]
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

  const toggleDepartment = (id: number) => {
    setSelectedDepartmentIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(deptId => deptId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const saveDepartments = () => {
    // Note: Primary department concept removed - only use selected departments
    // Just save the selected departments, no need to set a primary one
    setShowDepartmentModal(false);
  };

  // Safe layout handler to prevent null reference errors
  const handleSectionLayout = (key: string) => (e: any) => {
    if (!e || !e.nativeEvent || !e.nativeEvent.layout) {
      return;
    }
    try {
      const y = e.nativeEvent.layout.y;
      if (typeof y === 'number' && !isNaN(y) && isFinite(y)) {
        setSectionY((prev) => ({ ...prev, [key]: y }));
      }
    } catch (error) {
      // Silently ignore layout errors
      if (__DEV__) {
        console.warn('Layout error for section:', key, error);
      }
    }
  };

  const scrollToSection = (key: string) => {
    const y = sectionY[key];
    if (y != null && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  };

  const profileCompletion = doctor ? Math.round(calculateProfileCompletion(doctor) * 100) : 0;

  return (
    <ScreenSafeArea 
      backgroundColor={ModernColors.primary.main} 
      excludeBottom={true}
      statusBarStyle="light-content"
    >
      <View style={styles.container}>
        
        {/* Uber-style Header: solid blue, name+rating left, photo right, Edit/Cancel top-right */}
        <View style={[styles.headerGradient, styles.headerSolid]}>
          <View style={styles.headerContent}>
            <View />
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
          <View style={styles.headerProfileRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerName}>{doctor?.name || 'Doctor Name'}</Text>
              <View style={styles.ratingRow}>
                <Star size={16} color="#fff" fill="#fff" />
                <Text style={styles.ratingText}>
                  {doctor?.average_rating != null ? Number(doctor.average_rating).toFixed(2) : '—'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={isEditing ? handlePickImage : undefined}
              style={styles.headerPhotoWrap}
              activeOpacity={isEditing ? 0.8 : 1}
              disabled={!isEditing}
            >
              <Image
                key={`profile-${doctor?.id || 'unknown'}-${profilePhotoUri || getProfilePhotoUrl(doctor)}-${Date.now()}`}
                source={{
                  uri: profilePhotoUri
                    ? (profilePhotoUri.includes('?') ? profilePhotoUri : `${profilePhotoUri}?t=${Date.now()}`)
                    : `${getProfilePhotoUrl(doctor)}?t=${Date.now()}`,
                }}
                style={styles.headerPhoto}
                onError={(e) => {
                  console.error('Image load error:', e.nativeEvent.error);
                }}
              />
              {isEditing && (
                <View style={styles.cameraIconOverlay}>
                  <Camera size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick access grid: Wallet, Banking, Documents */}
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickGridItem} onPress={() => router.push('/(tabs)/wallet')} activeOpacity={0.7}>
              <Wallet size={22} color={ModernColors.primary.main} />
              <Text style={styles.quickGridLabel}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickGridItem} onPress={() => setShowBankingForm(true)} activeOpacity={0.7}>
              <Landmark size={22} color={ModernColors.primary.main} />
              <Text style={styles.quickGridLabel}>Banking</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickGridItem} onPress={() => scrollToSection('documents')} activeOpacity={0.7}>
              <FileText size={22} color={ModernColors.primary.main} />
              <Text style={styles.quickGridLabel}>Documents</Text>
            </TouchableOpacity>
          </View>

          {/* Informational cards: Profile Completion, Verification */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Profile Completion</Text>
              <Text style={styles.infoCardDesc}>{profileCompletion}% complete</Text>
            </View>
            <View style={styles.infoCardIcon}>
              <CheckCircle size={28} color={ModernColors.primary.main} />
            </View>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Verification</Text>
              <Text style={styles.infoCardDesc}>
                {doctor?.verification_status === 'approved' ? 'Verified' : 'Pending verification'}
              </Text>
            </View>
            <View style={styles.infoCardIcon}>
              {doctor?.verification_status === 'approved' ? (
                <CheckCircle size={28} color={ModernColors.primary.main} />
              ) : (
                <AlertCircle size={28} color={ModernColors.primary.main} />
              )}
            </View>
          </View>

          {/* Options list: scroll to Contact, Banking, Professional, Documents */}
          <View style={styles.optionsList}>
            <TouchableOpacity style={styles.optionRow} onPress={() => scrollToSection('contact')} activeOpacity={0.7}>
              <View style={styles.optionIconWrap}>
                <User size={20} color={ModernColors.primary.main} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Contact Information</Text>
                <Text style={styles.optionSubtitle}>Email, phone, location</Text>
              </View>
              <ChevronRight size={20} color={ModernColors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => { scrollToSection('banking'); setShowBankingForm(true); }} activeOpacity={0.7}>
              <View style={styles.optionIconWrap}>
                <Landmark size={20} color={ModernColors.primary.main} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Banking Details</Text>
                <Text style={styles.optionSubtitle}>Bank account, UPI</Text>
              </View>
              <ChevronRight size={20} color={ModernColors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => scrollToSection('professional')} activeOpacity={0.7}>
              <View style={styles.optionIconWrap}>
                <Briefcase size={20} color={ModernColors.primary.main} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Professional Details</Text>
                <Text style={styles.optionSubtitle}>Qualifications, experience</Text>
              </View>
              <ChevronRight size={20} color={ModernColors.text.tertiary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={() => scrollToSection('documents')} activeOpacity={0.7}>
              <View style={styles.optionIconWrap}>
                <FileText size={20} color={ModernColors.primary.main} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Documents</Text>
                <Text style={styles.optionSubtitle}>Degree, ID, registration</Text>
              </View>
              <ChevronRight size={20} color={ModernColors.text.tertiary} />
            </TouchableOpacity>
          </View>

          {!isEditing ? (
            /* View Mode */
            <>
              {/* Contact Information */}
              <View onLayout={handleSectionLayout('contact')}>
                <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <User size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Contact Information</Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.iconWrapper}>
                    <Mail size={18} color={ModernColors.primary.main} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Email</Text>
                    <Text style={styles.detailValue}>{doctor?.email || 'Not provided'}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.iconWrapper}>
                    <Phone size={18} color={ModernColors.primary.main} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{doctor?.phone_number || 'Not provided'}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.iconWrapper}>
                    <MapPin size={18} color={ModernColors.primary.main} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Location</Text>
                    <Text style={styles.detailValue}>{doctor?.current_location || 'Not provided'}</Text>
                  </View>
                </View>
              </ModernCard>
              </View>

              {/* Banking Details */}
              <View onLayout={handleSectionLayout('banking')}>
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Landmark size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Banking Details</Text>
                </View>
                {bankingDetails?.has_banking_details ? (
                  <>
                    <View style={styles.detailRow}>
                      <View style={styles.iconWrapper}>
                        <CreditCard size={18} color={ModernColors.primary.main} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Account Holder</Text>
                        <Text style={styles.detailValue}>{bankingDetails.bank_account_holder_name || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.iconWrapper}>
                        <CreditCard size={18} color={ModernColors.primary.main} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Account Number</Text>
                        <Text style={styles.detailValue}>
                          {bankingDetails.bank_account_number
                            ? '****' + bankingDetails.bank_account_number.slice(-4)
                            : '—'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.iconWrapper}>
                        <CreditCard size={18} color={ModernColors.primary.main} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>IFSC Code</Text>
                        <Text style={styles.detailValue}>{bankingDetails.bank_ifsc_code || '—'}</Text>
                      </View>
                    </View>
                    {(bankingDetails.bank_name || bankingDetails.bank_branch) && (
                      <View style={styles.detailRow}>
                        <View style={styles.iconWrapper}>
                          <Building2 size={18} color={ModernColors.primary.main} />
                        </View>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Bank / Branch</Text>
                          <Text style={styles.detailValue}>
                            {[bankingDetails.bank_name, bankingDetails.bank_branch].filter(Boolean).join(' • ') || '—'}
                          </Text>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.editButton, { alignSelf: 'flex-start', marginTop: Spacing.sm }]}
                      onPress={() => setShowBankingForm(true)}
                    >
                      <Edit2 size={18} color={ModernColors.primary.main} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ paddingVertical: Spacing.md }}>
                    <Text style={[styles.detailValue, { marginBottom: Spacing.md, color: ModernColors.text.secondary }]}>
                      No banking details. Add them to receive payments.
                    </Text>
                    <TouchableOpacity
                      style={[styles.editButton, { alignSelf: 'flex-start' }]}
                      onPress={() => setShowBankingForm(true)}
                    >
                      <CreditCard size={18} color={ModernColors.primary.main} />
                      <Text style={styles.editButtonText}>Add Banking Details</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ModernCard>
              </View>

              {/* Professional Details */}
              <View onLayout={handleSectionLayout('professional')}>
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Briefcase size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Professional Details</Text>
                </View>

                {/* Departments Section */}
                <View style={styles.detailRow}>
                  <Briefcase size={18} color={ModernColors.text.secondary} />
                  <Text style={styles.detailLabel}>Departments</Text>
                  <View style={{ flex: 1, alignItems: 'flex-end', gap: 4 }}>
                    {/* Selected Departments - All departments shown equally, no primary concept */}
                    {doctor?.departments && Array.isArray(doctor.departments) && doctor.departments.length > 0 ? (
                      doctor.departments.map((dept: any) => (
                        <Text key={dept.id || dept.name} style={styles.detailValue}>
                          {dept.name || dept.department?.name || 'N/A'}
                        </Text>
                      ))
                    ) : (
                      <Text style={[styles.detailValue, { color: ModernColors.text.secondary, fontStyle: 'italic' }]}>
                        No departments selected
                      </Text>
                    )}
                  </View>
                </View>

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
              </View>

              {/* Documents */}
              <View onLayout={handleSectionLayout('documents')}>
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
                      <FileText size={16} color={ModernColors.primary.main} />
                      <Text style={styles.documentText}>Degree Certificate</Text>
                      <CheckCircle size={16} color={ModernColors.primary.main} />
                    </View>
                  ) : (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.text.tertiary} />
                      <Text style={[styles.documentText, styles.documentTextMissing]}>Degree Certificate</Text>
                    </View>
                  )}
                  {doctor?.id_proof ? (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.primary.main} />
                      <Text style={styles.documentText}>ID Proof</Text>
                      <CheckCircle size={16} color={ModernColors.primary.main} />
                    </View>
                  ) : (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.text.tertiary} />
                      <Text style={[styles.documentText, styles.documentTextMissing]}>ID Proof</Text>
                    </View>
                  )}
                  {doctor?.medical_registration_certificate ? (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.primary.main} />
                      <Text style={styles.documentText}>Medical Registration</Text>
                      <CheckCircle size={16} color={ModernColors.primary.main} />
                    </View>
                  ) : (
                    <View style={styles.documentItem}>
                      <FileText size={16} color={ModernColors.text.tertiary} />
                      <Text style={[styles.documentText, styles.documentTextMissing]}>Medical Registration</Text>
                    </View>
                  )}
                </View>
              </ModernCard>
              </View>
            </>
          ) : (
            /* Edit Mode */
            <>
              {/* Basic Details */}
              <View onLayout={handleSectionLayout('contact')}>
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
              </View>

              {/* Banking Details (edit mode) */}
              <View onLayout={handleSectionLayout('banking')}>
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionIconContainer}>
                    <Landmark size={20} color={ModernColors.primary.main} />
                  </View>
                  <Text style={styles.sectionTitle}>Banking Details</Text>
                </View>
                {bankingDetails?.has_banking_details ? (
                  <>
                    <View style={styles.detailRow}>
                      <View style={styles.iconWrapper}>
                        <CreditCard size={18} color={ModernColors.primary.main} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Account Holder</Text>
                        <Text style={styles.detailValue}>{bankingDetails.bank_account_holder_name || '—'}</Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.iconWrapper}>
                        <CreditCard size={18} color={ModernColors.primary.main} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Account Number</Text>
                        <Text style={styles.detailValue}>
                          {bankingDetails.bank_account_number
                            ? '****' + bankingDetails.bank_account_number.slice(-4)
                            : '—'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.detailRow}>
                      <View style={styles.iconWrapper}>
                        <CreditCard size={18} color={ModernColors.primary.main} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>IFSC Code</Text>
                        <Text style={styles.detailValue}>{bankingDetails.bank_ifsc_code || '—'}</Text>
                      </View>
                    </View>
                    {(bankingDetails.bank_name || bankingDetails.bank_branch) && (
                      <View style={styles.detailRow}>
                        <View style={styles.iconWrapper}>
                          <Building2 size={18} color={ModernColors.primary.main} />
                        </View>
                        <View style={styles.detailContent}>
                          <Text style={styles.detailLabel}>Bank / Branch</Text>
                          <Text style={styles.detailValue}>
                            {[bankingDetails.bank_name, bankingDetails.bank_branch].filter(Boolean).join(' • ') || '—'}
                          </Text>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity
                      style={[styles.editButton, { alignSelf: 'flex-start', marginTop: Spacing.sm }]}
                      onPress={() => setShowBankingForm(true)}
                    >
                      <Edit2 size={18} color={ModernColors.primary.main} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={{ paddingVertical: Spacing.md }}>
                    <Text style={[styles.detailValue, { marginBottom: Spacing.md, color: ModernColors.text.secondary }]}>
                      No banking details. Add them to receive payments.
                    </Text>
                    <TouchableOpacity
                      style={[styles.editButton, { alignSelf: 'flex-start' }]}
                      onPress={() => setShowBankingForm(true)}
                    >
                      <CreditCard size={18} color={ModernColors.primary.main} />
                      <Text style={styles.editButtonText}>Add Banking Details</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ModernCard>
              </View>

              {/* Professional Details */}
              <View onLayout={handleSectionLayout('professional')}>
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <Text style={styles.editSectionTitle}>Professional Information</Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Departments</Text>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDepartmentModal(true)}
                  >
                    <Text style={{ color: selectedDepartmentIds.length > 0 ? ModernColors.text.primary : ModernColors.text.tertiary }}>
                      {selectedDepartmentIds.length > 0 
                        ? `${selectedDepartmentIds.length} department${selectedDepartmentIds.length > 1 ? 's' : ''} selected`
                        : 'Select departments...'}
                    </Text>
                  </TouchableOpacity>
                  {selectedDepartmentIds.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {departments
                        .filter(d => selectedDepartmentIds.includes(d.id))
                        .map(d => (
                          <View key={d.id} style={{
                            backgroundColor: ModernColors.primary.light,
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 12,
                          }}>
                            <Text style={{
                              color: ModernColors.primary.main,
                              fontSize: 12,
                              fontWeight: '500'
                            }}>{d.name}</Text>
                          </View>
                        ))
                      }
                    </View>
                  )}
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
              </View>

              {/* Documents */}
              <View onLayout={handleSectionLayout('documents')}>
              <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
                <Text style={styles.editSectionTitle}>Documents</Text>
                
                {/* Degree Certificate */}
                <View style={styles.documentSection}>
                  <Text style={styles.documentLabel}>Degree Certificate</Text>
                  {(documents.degree_certificate || doctor?.degree_certificate) ? (
                    <View style={styles.documentPreview}>
                      <View style={styles.documentPreviewInfo}>
                        <FileText size={20} color={ModernColors.primary.main} />
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
                        <FileText size={20} color={ModernColors.primary.main} />
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
                        <FileText size={20} color={ModernColors.primary.main} />
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
              </View>

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

      <BankingDetailsForm
        visible={showBankingForm}
        onClose={() => setShowBankingForm(false)}
        onSuccess={async () => { await loadBanking(); }}
        initialData={bankingDetails || undefined}
      />

      {/* Department Selection Modal */}
      <Modal
        visible={showDepartmentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDepartmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Departments</Text>
              <TouchableOpacity onPress={() => setShowDepartmentModal(false)} style={styles.closeButton}>
                <X size={24} color={ModernColors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {departments.map((dept: any) => {
                const isSelected = selectedDepartmentIds.includes(dept.id);
                return (
                  <TouchableOpacity
                    key={dept.id}
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected
                    ]}
                    onPress={() => toggleDepartment(dept.id)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      isSelected && styles.modalOptionTextSelected
                    ]}>
                      {dept.name}
                    </Text>
                    {isSelected && (
                      <Check size={20} color={ModernColors.primary.main} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.modalButtonPrimary}
                onPress={saveDepartments}
              >
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ModernColors.background.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: ModernColors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  modalList: {
    padding: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  modalOptionSelected: {
    backgroundColor: '#F0F9FF',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
    color: ModernColors.text.secondary,
  },
  modalOptionTextSelected: {
    color: ModernColors.primary.main,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButtonPrimary: {
    backgroundColor: ModernColors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  headerSolid: {
    backgroundColor: '#2563EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerProfileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  headerPhotoWrap: {
    position: 'relative',
    marginLeft: 16,
  },
  headerPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickGridItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ModernColors.text.primary,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: ModernColors.text.primary,
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 14,
    color: ModernColors.text.secondary,
  },
  infoCardIcon: {
    marginLeft: 12,
  },
  optionsList: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${ModernColors.primary.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ModernColors.text.primary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: ModernColors.text.secondary,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    width: '100%',
    maxWidth: IS_TABLET ? CONTENT_MAX_WIDTH : '100%',
    alignSelf: 'center',
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
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ModernColors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...Typography.captionBold,
    color: ModernColors.text.secondary,
    marginBottom: 2,
  },
  detailValue: {
    ...Typography.body,
    color: ModernColors.text.primary,
    fontWeight: '500',
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
    backgroundColor: ModernColors.primary.light || '#DBEAFE',
    borderWidth: 1,
    borderColor: ModernColors.primary.main,
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
    color: ModernColors.primary.main,
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
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    gap: 4,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '600',
  },
});