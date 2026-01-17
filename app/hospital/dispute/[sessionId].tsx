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
import { ScreenSafeArea } from '@/components/screen-safe-area';
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
        setEvidenceFiles(prev => [...prev, {
          uri: asset.uri,
          name: asset.fileName || 'image.jpg',
          type: asset.mimeType || 'image/jpeg',
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
        setEvidenceFiles(prev => [...prev, {
          uri: asset.uri,
          name: asset.name,
          type: asset.mimeType || 'application/pdf',
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
      const formData = new FormData();
      // Ensure job_session_id is sent as integer
      formData.append('job_session_id', String(sessionId));
      formData.append('dispute_type', disputeType);
      formData.append('title', title.trim());
      formData.append('description', description.trim());

      // Append evidence files - use evidence[] for array notation
      evidenceFiles.forEach((file) => {
        const fileUri = Platform.OS === 'ios' ? file.uri.replace('file://', '') : file.uri;
        formData.append('evidence[]', {
          uri: fileUri,
          name: file.name,
          type: file.type,
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
      }

      // Don't set Content-Type manually - axios will set it automatically with boundary for FormData
      const response = await API.post('/disputes', formData);

      Alert.alert(
        'Success',
        `Dispute created successfully! Dispute ID: ${response.data.dispute.id}`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating dispute:', error);
      
      // Handle validation errors
      if (error.response?.status === 422 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.entries(validationErrors)
          .map(([field, messages]: [string, any]) => {
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const messageArray = Array.isArray(messages) ? messages : [messages];
            return `${fieldLabel}: ${messageArray.join(', ')}`;
          })
          .join('\n');
        
        Alert.alert('Validation Error', errorMessages);
      } else {
        // Handle other errors
        const errorMessage = error.response?.data?.message || error.message || 'Failed to create dispute. Please try again.';
        Alert.alert('Error', errorMessage);
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
                onDismiss={() => setShowTypeMenu(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.selectButton}
                    onPress={() => setShowTypeMenu(true)}
                  >
                    <Text style={styles.selectButtonText}>{selectedTypeLabel}</Text>
                    <ArrowLeft size={16} color={NeutralColors.textSecondary} style={{ transform: [{ rotate: '-90deg' }] }} />
                  </TouchableOpacity>
                }
              >
                {disputeTypes.map((type) => (
                  <Menu.Item
                    key={type.value}
                    onPress={() => {
                      setDisputeType(type.value);
                      setShowTypeMenu(false);
                    }}
                    title={type.label}
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
