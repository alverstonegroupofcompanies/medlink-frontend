import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  StatusBar,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  AlertCircle,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import { API_BASE_URL } from '@/config/api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card, Text, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

interface EvidenceFile {
  uri: string;
  name: string;
  type: string;
}

export default function HospitalDisputeFormScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [disputeType, setDisputeType] = useState<string>('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const disputeTypes = [
    { label: 'Payment', value: 'payment' },
    { label: 'Attendance', value: 'attendance' },
    { label: 'Quality', value: 'quality' },
    { label: 'Other', value: 'other' },
  ];

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
        StatusBar.setBarStyle('light-content', true);
      }
      StatusBar.setBarStyle('light-content', true);
      loadSession();
      return () => {};
    }, [sessionId])
  );

  const loadSession = async () => {
    try {
      const response = await API.get(`/hospital/sessions/${sessionId}`);
      setSession(response.data.session);
    } catch (error: any) {
      console.error('Error loading session:', error);
      Alert.alert('Error', 'Failed to load session details');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || asset.uri.split('/').pop() || `image_${Date.now()}.jpg`;
        const mimeType = asset.mimeType || 'image/jpeg';
        
        if (__DEV__) {
          console.log('📷 Image picked:', {
            uri: asset.uri,
            fileName,
            mimeType,
            platform: Platform.OS,
          });
        }
        
        setEvidenceFiles(prev => [...prev, {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        }]);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to pick image: ${error.message}`);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.name || asset.uri.split('/').pop() || `document_${Date.now()}.pdf`;
        const mimeType = asset.mimeType || 'application/pdf';
        
        if (__DEV__) {
          console.log('📄 Document picked:', {
            uri: asset.uri,
            fileName,
            mimeType,
            platform: Platform.OS,
          });
        }
        
        setEvidenceFiles(prev => [...prev, {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        }]);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeEvidence = (index: number) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a dispute title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a dispute description');
      return;
    }
    if (title.length > 255) {
      Alert.alert('Validation Error', 'Title must be 255 characters or less');
      return;
    }
    if (description.length > 2000) {
      Alert.alert('Validation Error', 'Description must be 2000 characters or less');
      return;
    }

    setLoading(true);
    try {
      // Log the full URL that will be used (for debugging only, no blocking)
      if (__DEV__) {
        const fullUrl = `${API_BASE_URL}/disputes`;
        console.log('🔗 Full dispute URL:', fullUrl);
        console.log('📋 Request will be sent to:', fullUrl);
      }

      const formData = new FormData();
      // Ensure job_session_id is sent as integer
      formData.append('job_session_id', String(sessionId));
      formData.append('dispute_type', disputeType);
      formData.append('title', title.trim());
      formData.append('description', description.trim());

      // Append evidence files - Laravel automatically collects multiple files with same key as array
      evidenceFiles.forEach((file) => {
        let fileUri = file.uri;
        
        // Fix file URI for platform compatibility
        if (Platform.OS === 'android') {
          // Android FormData requires file:// prefix
          if (!fileUri.startsWith('file://') && !fileUri.startsWith('content://')) {
            fileUri = `file://${fileUri}`;
          }
        } else if (Platform.OS === 'ios') {
          // iOS FormData requires file:// prefix removed
          fileUri = fileUri.replace('file://', '');
        }
        
        // Ensure MIME type is set
        let mimeType = file.type;
        if (!mimeType || mimeType === '') {
          const extension = file.name.split('.').pop()?.toLowerCase();
          const mimeTypes: Record<string, string> = {
            'pdf': 'application/pdf',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
          };
          mimeType = mimeTypes[extension || ''] || 'application/octet-stream';
        }
        
        if (__DEV__) {
          console.log('📎 Appending evidence file:', {
            originalUri: file.uri,
            processedUri: fileUri,
            name: file.name,
            type: mimeType,
            platform: Platform.OS,
          });
        }
        
        formData.append('evidence', {
          uri: fileUri,
          name: file.name,
          type: mimeType,
        } as any);
      });

      // Log the exact URL being called and FormData contents
      const fullUrl = `${API_BASE_URL}/disputes`;
      console.log('═══════════════════════════════════════');
      console.log('📤 DISPUTE SUBMISSION STARTING');
      console.log('═══════════════════════════════════════');
      console.log('🔗 Full URL:', fullUrl);
      console.log('📋 Request Details:', {
        job_session_id: sessionId,
        dispute_type: disputeType,
        title: title.trim(),
        description_length: description.trim().length,
        evidence_files_count: evidenceFiles.length,
      });
      console.log('📦 FormData entries:', {
        hasJobSessionId: formData._parts?.some((p: any) => p[0] === 'job_session_id'),
        hasDisputeType: formData._parts?.some((p: any) => p[0] === 'dispute_type'),
        hasTitle: formData._parts?.some((p: any) => p[0] === 'title'),
        hasDescription: formData._parts?.some((p: any) => p[0] === 'description'),
        evidenceCount: formData._parts?.filter((p: any) => p[0] === 'evidence').length || 0,
      });
      
      // Log each file being sent
      if (evidenceFiles.length > 0) {
        console.log('📎 Evidence files to upload:');
        evidenceFiles.forEach((file, index) => {
          console.log(`   File ${index + 1}:`, {
            name: file.name,
            type: file.type,
            uriLength: file.uri.length,
            uriPreview: file.uri.substring(0, 50) + '...',
          });
        });
      } else {
        console.log('📎 No evidence files to upload');
      }
      
      // Get hospital token for authentication
      const hospitalToken = await AsyncStorage.getItem('hospitalToken');
      if (!hospitalToken) {
        Alert.alert('Authentication Error', 'Please log in again to submit a dispute.');
        setLoading(false);
        router.replace('/login');
        return;
      }

      // Retry logic for network errors (similar to registration forms)
      // Use fetch API directly like registration - more reliable for FormData
      const maxRetries = 3;
      let lastError: any = null;
      let responseData: any = null;
      const url = `${API_BASE_URL}/disputes`;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            if (__DEV__) {
              console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries + 1}...`);
            }
            await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
          }

          if (__DEV__) {
            console.log(`📤 Attempting dispute submission (attempt ${attempt + 1})...`);
          }

          // Use AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 minutes

          try {
            const response = await fetch(url, {
              method: 'POST',
              body: formData, // FormData - don't set Content-Type, fetch handles it
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${hospitalToken}`,
                // Don't set Content-Type - let fetch handle it automatically for FormData
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse response
            responseData = await response.json();

            // Check if response is ok
            if (!response.ok) {
              // Don't retry on validation errors (4xx) - these are real errors
              if (response.status >= 400 && response.status < 500) {
                if (__DEV__) {
                  console.log('⚠️ Validation error - not retrying');
                }
                throw {
                  response: {
                    status: response.status,
                    data: responseData,
                  },
                  message: responseData?.message || 'Validation failed',
                };
              }

              // Retry on server errors (5xx)
              if (response.status >= 500) {
                throw {
                  response: {
                    status: response.status,
                    data: responseData,
                  },
                  message: responseData?.message || 'Server error',
                };
              }
            }

            // Success - break out of retry loop
            if (__DEV__) {
              console.log('✅ Dispute submission successful!');
            }
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
        } catch (error: any) {
          lastError = error;
          if (__DEV__) {
            console.error(`❌ Dispute submission attempt ${attempt + 1} failed:`, error.message || error);
          }
          
          // Don't retry on validation errors (4xx) - these are real errors
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            if (__DEV__) {
              console.log('⚠️ Validation error - not retrying');
            }
            throw error;
          }
          
          // Retry on network/SSL errors
          const isNetworkError = 
            error.code === 'ERR_NETWORK' ||
            error.code === 'NETWORK_ERROR' ||
            error.code === 'ETIMEDOUT' ||
            error.code === 'ECONNREFUSED' ||
            error.name === 'AbortError' ||
            error.message?.includes('Network') ||
            error.message?.includes('Unable to connect') ||
            error.message?.includes('SSL') ||
            error.message?.includes('certificate') ||
            error.message?.includes('timeout') ||
            !error.response; // No response = network error
          
          if (attempt < maxRetries && isNetworkError) {
            const delaySeconds = 3 * (attempt + 1);
            if (__DEV__) {
              console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry in ${delaySeconds}s...`);
            }
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            continue;
          }
          
          // No more retries or non-retryable error
          if (__DEV__) {
            console.error('❌ Max retries reached or non-retryable error');
          }
          throw error;
        }
      }
      
      if (!responseData) {
        throw lastError || new Error('Dispute submission failed after all retries');
      }

      if (__DEV__) {
        console.log('═══════════════════════════════════════');
        console.log('✅ REQUEST SENT AND RESPONSE RECEIVED');
        console.log('═══════════════════════════════════════');
        console.log('📥 Full Response Data:', JSON.stringify(responseData, null, 2));
        console.log('📥 Response Structure:', {
          hasData: !!responseData,
          hasDispute: !!responseData?.dispute,
          disputeId: responseData?.dispute?.id,
          message: responseData?.message,
          fullKeys: responseData ? Object.keys(responseData) : [],
        });
        console.log('═══════════════════════════════════════');
      }

      // Handle different response structures
      const disputeId = responseData?.dispute?.id || responseData?.id || responseData?.dispute_id;
      const successMessage = responseData?.message || 'Dispute created successfully!';
      
      if (!disputeId && __DEV__) {
        console.warn('⚠️ No dispute ID in response, but request succeeded');
        console.warn('Response data:', responseData);
      }

      Alert.alert(
        'Success',
        disputeId 
          ? `Dispute created successfully! Dispute ID: ${disputeId}`
          : successMessage,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      // Enhanced error logging for debugging
      console.error('═══════════════════════════════════════');
      console.error('❌ DISPUTE SUBMISSION FAILED');
      console.error('═══════════════════════════════════════');
      console.error('Error Message:', error.message);
      console.error('Error Code:', error.code);
      
      if (error.config) {
        console.error('Request Config:', {
          url: error.config.url,
          method: error.config.method,
          baseURL: error.config.baseURL,
          fullURL: `${error.config.baseURL}${error.config.url}`,
          hasFormData: error.config.data instanceof FormData,
          timeout: error.config.timeout,
        });
      } else {
        console.error('⚠️ No request config found - request may not have been sent');
      }
      
      if (error.response) {
        console.error('✅ Request reached server!');
        console.error('Response Status:', error.response.status);
        console.error('Response Data:', error.response.data);
      } else {
        console.error('❌ Request did NOT reach server');
        console.error('This is a network/connection error');
        console.error('Request Details:');
        if (error.config) {
          const fullUrl = error.config.baseURL ? `${error.config.baseURL}${error.config.url}` : 'Unknown';
          console.error('   Attempted URL:', fullUrl);
          console.error('   Base URL:', error.config.baseURL || 'Not set');
          console.error('   Endpoint:', error.config.url || 'Not set');
        }
        console.error('Possible causes:');
        console.error('  1. Backend server is not running');
        console.error('  2. Wrong IP address in .env (check EXPO_PUBLIC_BACKEND_URL)');
        console.error('  3. Firewall blocking connection');
        console.error('  4. Phone and PC not on same WiFi');
        console.error('  5. Backend URL not accessible from device');
      }
      console.error('═══════════════════════════════════════');

      // Use user-friendly message from API interceptor (already set by api.js)
      const errorMessage = error.userFriendlyMessage || error.message || 'Failed to create dispute. Please try again.';
      
      // Handle different error types with improved messages
      if (error.response?.status === 422 && error.response?.data?.errors) {
        // Validation errors - show detailed field-specific errors
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]: [string, any]) => {
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const messageArray = Array.isArray(messages) ? messages : [messages];
            return `${fieldLabel}: ${messageArray.join(', ')}`;
          })
          .join('\n\n');
        
        Alert.alert('Validation Error', `Please fix the following errors:\n\n${errorMessages}`);
      } else if (error.response?.status === 400) {
        // Bad request (e.g., dispute already exists)
        const serverMessage = error.response.data?.message || 'Invalid request. Please check your input and try again.';
        Alert.alert('Error', serverMessage);
      } else if (error.response?.status === 401) {
        // Unauthorized - token issue
        Alert.alert(
          'Authentication Error', 
          'Your session has expired or you are not logged in. Please log in again and try.',
          [
            { text: 'OK', onPress: () => router.replace('/hospital/login') }
          ]
        );
      } else if (error.response?.status === 403) {
        // Forbidden - not authorized for this session
        const serverMessage = error.response.data?.message || 'You do not have permission to create a dispute for this session. Please ensure you are logged in as the correct hospital.';
        Alert.alert('Permission Denied', serverMessage);
      } else if (error.response?.status === 404) {
        // Not found
        Alert.alert('Not Found', 'The session or resource was not found. Please verify the session ID and try again.');
      } else if (error.response?.status >= 500) {
        // Server error
        const serverMessage = error.response.data?.message || 'Server error occurred. Please try again later or contact support if the problem persists.';
        Alert.alert('Server Error', serverMessage);
      } else if (!error.response) {
        // Network errors
        Alert.alert(
          'Connection Error', 
          'Unable to connect to the server. Please check your internet connection and try again.',
          [{ text: 'OK' }]
        );
      } else {
        // Other errors
        Alert.alert('Error Creating Dispute', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeLabel = disputeTypes.find(t => t.value === disputeType)?.label || 'Select Type';

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark} statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Raise Dispute</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Session Info Card */}
        {session && (
          <Card style={styles.infoCard} mode="outlined">
            <Card.Content>
              <View style={styles.infoRow}>
                <AlertCircle size={16} color={PrimaryColors.main} />
                <Text style={styles.infoText}>
                  Disputing session: {session.job_requirement?.department || 'Session'} - {new Date(session.session_date).toLocaleDateString()}
                </Text>
              </View>
              {session.doctor && (
                <Text style={styles.infoSubtext}>
                  Doctor: Dr. {session.doctor.name}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Dispute Form Card */}
        <Card style={styles.formCard} mode="elevated" elevation={2}>
          <Card.Content>
            {/* Dispute Type */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dispute Type *</Text>
              <Menu
                visible={showTypeMenu}
                onDismiss={() => {
                  // Small delay to ensure menu fully closes before allowing reopen
                  setTimeout(() => setShowTypeMenu(false), 100);
                }}
                anchor={
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => {
                      // Force close and reopen to ensure menu works
                      if (showTypeMenu) {
                        setShowTypeMenu(false);
                        setTimeout(() => setShowTypeMenu(true), 150);
                      } else {
                        setShowTypeMenu(true);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.selectButtonText}>{selectedTypeLabel}</Text>
                    <ArrowLeft size={16} color={NeutralColors.textSecondary} style={{ transform: [{ rotate: showTypeMenu ? '90deg' : '-90deg' }] }} />
                  </TouchableOpacity>
                }
                contentStyle={styles.menuContent}
              >
                {disputeTypes.map((type) => (
                  <Menu.Item
                    key={type.value}
                    onPress={() => {
                      setDisputeType(type.value);
                      setShowTypeMenu(false);
                    }}
                    title={type.label}
                    titleStyle={disputeType === type.value ? styles.selectedMenuItem : undefined}
                  />
                ))}
              </Menu>
            </View>

            {/* Title */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.textInput}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter dispute title"
                placeholderTextColor={NeutralColors.textLight}
                maxLength={255}
              />
              <Text style={styles.charCount}>{title.length}/255</Text>
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the issue in detail..."
                placeholderTextColor={NeutralColors.textLight}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={2000}
              />
              <Text style={styles.charCount}>{description.length}/2000</Text>
            </View>

            {/* Evidence Upload */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Evidence (Optional)</Text>
              <Text style={styles.helperText}>
                Upload supporting documents or images (PDF, JPG, PNG - Max 5MB each)
              </Text>
              
              <View style={styles.uploadButtons}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                >
                  <ImageIcon size={18} color={PrimaryColors.main} />
                  <Text style={styles.uploadButtonText}>Add Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickDocument}
                >
                  <FileText size={18} color={PrimaryColors.main} />
                  <Text style={styles.uploadButtonText}>Add Document</Text>
                </TouchableOpacity>
              </View>

              {/* Evidence List */}
              {evidenceFiles.length > 0 && (
                <View style={styles.evidenceList}>
                  {evidenceFiles.map((file, index) => (
                    <View key={index} style={styles.evidenceItem}>
                      <FileText size={16} color={PrimaryColors.main} />
                      <Text style={styles.evidenceName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeEvidence(index)}
                        style={styles.removeButton}
                      >
                        <X size={16} color={StatusColors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Divider style={styles.divider} />

            {/* Submit Button */}
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
              contentStyle={styles.submitButtonContent}
              labelStyle={styles.submitButtonLabel}
            >
              Submit Dispute
            </Button>

            <Text style={styles.noteText}>
              Your dispute will be reviewed by our admin team. You will be notified once a resolution is provided.
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: PrimaryColors.lightest,
    borderColor: PrimaryColors.light,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.dark,
    flex: 1,
  },
  infoSubtext: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: NeutralColors.border,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: {
    fontSize: 15,
    color: NeutralColors.textPrimary,
  },
  menuContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedMenuItem: {
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: NeutralColors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: NeutralColors.textPrimary,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: NeutralColors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },
  uploadButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  uploadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: PrimaryColors.main,
    borderRadius: 8,
    padding: 12,
    backgroundColor: PrimaryColors.lightest,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  evidenceList: {
    gap: 8,
    marginTop: 8,
  },
  evidenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    backgroundColor: PrimaryColors.lightest,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PrimaryColors.light,
  },
  evidenceName: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.textPrimary,
  },
  removeButton: {
    padding: 4,
  },
  divider: {
    marginVertical: 20,
  },
  submitButton: {
    backgroundColor: PrimaryColors.main,
    borderRadius: 12,
    marginBottom: 12,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  noteText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
