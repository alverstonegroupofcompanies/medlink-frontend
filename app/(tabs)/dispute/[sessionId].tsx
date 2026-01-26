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
import { ModernColors } from '@/constants/modern-theme';
import API from '../../api';
import { API_BASE_URL } from '@/config/api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { Card, Text, Button, ActivityIndicator, Menu, Divider } from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

interface EvidenceFile {
  uri: string;
  name: string;
  type: string;
}

export default function DoctorDisputeFormScreen() {
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
        StatusBar.setBackgroundColor(ModernColors.primary.main, true);
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
      // Get session from history/sessions list or use job_session_id from route
      // For now, we'll get it from the sessions endpoint and filter
      const response = await API.get('/doctor/sessions');
      const sessions = response.data.sessions || [];
      const foundSession = sessions.find((s: any) => s.id.toString() === sessionId);
      if (foundSession) {
        setSession(foundSession);
      } else {
        // Try direct endpoint if available
        try {
          const directResponse = await API.get(`/doctor/sessions/${sessionId}`);
          setSession(directResponse.data.session);
        } catch {
          Alert.alert('Error', 'Session not found');
        }
      }
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
      // Test backend connectivity and verify URL construction
      if (__DEV__) {
        try {
          const testResponse = await API.get('/test', { timeout: 5000 });
          console.log('✅ Backend is reachable:', testResponse.data);
          
          // Log the full URL that will be used
          const fullUrl = `${API_BASE_URL}/disputes`;
          console.log('🔗 Full dispute URL:', fullUrl);
          console.log('📋 Request will be sent to:', fullUrl);
          
          // Test if we can reach the disputes endpoint (without submitting)
          try {
            const disputesTest = await API.get('/disputes', { timeout: 5000 });
            console.log('✅ Disputes endpoint is accessible');
          } catch (disputesTestError: any) {
            if (disputesTestError.response?.status === 401) {
              console.log('✅ Disputes endpoint exists (requires auth - expected)');
            } else {
              console.warn('⚠️ Disputes endpoint test:', disputesTestError.message);
            }
          }
        } catch (testError: any) {
          console.error('❌ Backend connectivity test failed:', {
            message: testError.message,
            code: testError.code,
            url: testError.config?.url,
            baseURL: testError.config?.baseURL,
          });
          Alert.alert(
            'Connection Error',
            'Cannot reach backend server. Please ensure:\n\n1. Backend is running: php artisan serve --host=0.0.0.0 --port=8000\n2. Phone and PC are on same WiFi\n3. IP address in .env is correct'
          );
          setLoading(false);
          return;
        }
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
          // Android FormData requires file:// prefix (unless it's content://)
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

      if (__DEV__) {
        console.log('📤 Submitting dispute:', {
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
      }

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
      
      console.log('⏳ Calling API.post() now...');
      console.log('   (Watch for "API INTERCEPTOR: Sending Dispute Request" log)');
      console.log('═══════════════════════════════════════');

      // Retry logic for network errors (similar to registration forms)
      const maxRetries = 2;
      let lastError: any = null;
      let response: any = null;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          // Use API (axios) for FormData - same as hospital; api.js sets base URL, auth, and Content-Type for FormData
          response = await API.post('/disputes', formData, {
            timeout: 120000, // 2 minutes for file uploads
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
          });
          
          // Success - break out of retry loop
          break;
        } catch (error: any) {
          lastError = error;
          console.error(`❌ Dispute submission attempt ${attempt + 1} failed:`, error.message || error);
          
          // Don't retry on validation errors (4xx) - these are real errors
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            console.log('⚠️ Validation error - not retrying');
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
            const delaySeconds = 2 * (attempt + 1);
            console.warn(`⚠️ Network error on attempt ${attempt + 1}, will retry in ${delaySeconds}s...`);
            await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
            continue;
          }
          
          // No more retries or non-retryable error
          console.error('❌ Max retries reached or non-retryable error');
          throw error;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Dispute submission failed after all retries');
      }
      
      console.log('═══════════════════════════════════════');
      console.log('✅ REQUEST SENT AND RESPONSE RECEIVED');
      console.log('═══════════════════════════════════════');
      console.log('📥 Response Status:', response.status);
      console.log('📥 Full Response Data:', JSON.stringify(response.data, null, 2));
      console.log('📥 Response Structure:', {
        hasData: !!response.data,
        hasDispute: !!response.data?.dispute,
        disputeId: response.data?.dispute?.id,
        message: response.data?.message,
        fullKeys: response.data ? Object.keys(response.data) : [],
      });
      console.log('═══════════════════════════════════════');

      // Handle different response structures
      const disputeId = response.data?.dispute?.id || response.data?.id || response.data?.dispute_id;
      const successMessage = response.data?.message || 'Dispute created successfully!';
      
      if (!disputeId) {
        console.warn('⚠️ No dispute ID in response, but request succeeded');
        console.warn('Response data:', response.data);
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
        console.error('✅ Request WAS sent (reached network layer)');
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
        console.error('Possible causes:');
        console.error('  1. Backend server is not running');
        console.error('  2. Wrong IP address in .env');
        console.error('  3. Firewall blocking connection');
        console.error('  4. Phone and PC not on same WiFi');
      }
      console.error('═══════════════════════════════════════');

      // Use user-friendly message from API interceptor (already set by api.js)
      const errorMessage = error.userFriendlyMessage || error.message || 'Failed to create dispute. Please try again.';
      
      // Handle different error types
      if (error.response?.status === 422 && error.response?.data?.errors) {
        // Validation errors
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]: [string, any]) => {
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const messageArray = Array.isArray(messages) ? messages : [messages];
            return `${fieldLabel}: ${messageArray.join(', ')}`;
          })
          .join('\n');
        
        Alert.alert('Validation Error', errorMessages);
      } else if (error.response?.status === 400) {
        // Bad request (e.g., dispute already exists)
        const serverMessage = error.response.data?.message || errorMessage;
        Alert.alert('Error', serverMessage);
      } else if (error.response?.status === 401) {
        // Unauthorized
        Alert.alert('Authentication Error', 'Please log in again and try.');
      } else if (error.response?.status === 403) {
        // Forbidden
        Alert.alert('Permission Denied', 'You do not have permission to create a dispute for this session.');
      } else if (error.response?.status === 404) {
        // Not found
        Alert.alert('Not Found', 'The session or resource was not found.');
      } else if (error.response?.status >= 500) {
        // Server error
        const serverMessage = error.response.data?.message || 'Server error. Please try again later.';
        Alert.alert('Server Error', serverMessage);
      } else {
        // Network errors or other issues
        Alert.alert('Error Creating Dispute', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectedTypeLabel = disputeTypes.find(t => t.value === disputeType)?.label || 'Select Type';

  return (
    <ScreenSafeArea backgroundColor={ModernColors.primary.main} statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ModernColors.primary.main} translucent={false} />
      
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
                <AlertCircle size={16} color={ModernColors.primary.main} />
                <Text style={styles.infoText}>
                  Disputing session: {session.job_requirement?.department || 'Session'} - {new Date(session.session_date).toLocaleDateString()}
                </Text>
              </View>
              {session.job_requirement?.hospital && (
                <Text style={styles.infoSubtext}>
                  Hospital: {session.job_requirement.hospital.name}
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
                    <ArrowLeft size={16} color={ModernColors.neutral.gray500} style={{ transform: [{ rotate: showTypeMenu ? '90deg' : '-90deg' }] }} />
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
                placeholderTextColor={ModernColors.neutral.gray400}
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
                placeholderTextColor={ModernColors.neutral.gray400}
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
                  <ImageIcon size={18} color={ModernColors.primary.main} />
                  <Text style={styles.uploadButtonText}>Add Image</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickDocument}
                >
                  <FileText size={18} color={ModernColors.primary.main} />
                  <Text style={styles.uploadButtonText}>Add Document</Text>
                </TouchableOpacity>
              </View>

              {/* Evidence List */}
              {evidenceFiles.length > 0 && (
                <View style={styles.evidenceList}>
                  {evidenceFiles.map((file, index) => (
                    <View key={index} style={styles.evidenceItem}>
                      <FileText size={16} color={ModernColors.primary.main} />
                      <Text style={styles.evidenceName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeEvidence(index)}
                        style={styles.removeButton}
                      >
                        <X size={16} color={ModernColors.error.main} />
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
    backgroundColor: '#F5F7FA',
  },
  headerContainer: {
    backgroundColor: ModernColors.primary.main,
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
    backgroundColor: ModernColors.primary.light,
    borderColor: ModernColors.primary.main,
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
    color: ModernColors.text.primary,
    flex: 1,
  },
  infoSubtext: {
    fontSize: 12,
    color: ModernColors.text.secondary,
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
    color: ModernColors.text.primary,
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: ModernColors.text.secondary,
    marginBottom: 12,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: ModernColors.neutral.gray300,
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  selectButtonText: {
    fontSize: 15,
    color: ModernColors.text.primary,
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
    color: ModernColors.primary.main,
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: ModernColors.neutral.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: ModernColors.text.primary,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 12,
  },
  charCount: {
    fontSize: 11,
    color: ModernColors.text.secondary,
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
    borderColor: ModernColors.primary.main,
    borderRadius: 8,
    padding: 12,
    backgroundColor: ModernColors.primary.light,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ModernColors.primary.main,
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
    backgroundColor: ModernColors.primary.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ModernColors.primary.main,
  },
  evidenceName: {
    flex: 1,
    fontSize: 13,
    color: ModernColors.text.primary,
  },
  removeButton: {
    padding: 4,
  },
  divider: {
    marginVertical: 20,
  },
  submitButton: {
    backgroundColor: ModernColors.primary.main,
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
    color: ModernColors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
