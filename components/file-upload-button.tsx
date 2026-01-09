import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, Alert, View, Image, ActivityIndicator } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  uploadDoctorPhoto,
  uploadDoctorDocument,
  uploadHospitalLogo,
  uploadHospitalLicense,
} from '@/utils/fileUpload';

type FileUploadButtonProps = {
  label: string;
  onFileSelected: (uri: string, name: string, type: string) => void;
  type?: 'image' | 'document' | 'both';
  acceptedTypes?: string[];
  uploadType?: 'doctor-photo' | 'doctor-document' | 'hospital-logo' | 'hospital-license' | 'none';
  documentType?: 'degree_certificate' | 'id_proof' | 'medical_registration_certificate';
  onUploadSuccess?: (response: any) => void;
  onUploadError?: (error: any) => void;
};

export function FileUploadButton({
  label,
  onFileSelected,
  type = 'both',
  acceptedTypes,
  uploadType = 'none',
  documentType,
  onUploadSuccess,
  onUploadError,
}: FileUploadButtonProps) {
  const colorScheme = useColorScheme();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const borderColor = colorScheme === 'dark' ? '#374151' : '#e5e7eb';
  const iconColor = colorScheme === 'dark' ? '#9BA1A6' : '#6b7280';

  const handleImagePicker = async () => {
    try {
      // Request media library permissions first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'We need camera roll permissions to upload files. Please enable it in your device settings.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const name = result.assets[0].fileName || 'image.jpg';
        const mimeType = result.assets[0].mimeType || 'image/jpeg';
        
        setSelectedImage(uri);
        onFileSelected(uri, name, mimeType);

        // Auto upload if uploadType is specified
        if (uploadType !== 'none') {
          await handleAutoUpload(uri, uploadType, documentType);
        }
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
      onUploadError?.({ message: `Failed to pick image: ${error.message || 'Unknown error'}` });
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes || '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        const name = result.assets[0].name;
        const mimeType = result.assets[0].mimeType || 'application/pdf';
        
        onFileSelected(uri, name, mimeType);

        // Auto upload if uploadType is specified
        if (uploadType !== 'none') {
          await handleAutoUpload(uri, uploadType, documentType);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
      onUploadError?.({ message: 'Failed to pick document' });
    }
  };

  const handleAutoUpload = async (
    fileUri: string,
    uploadType: string,
    docType?: string
  ) => {
    setLoading(true);
    try {
      let response;

      switch (uploadType) {
        case 'doctor-photo':
          response = await uploadDoctorPhoto(fileUri);
          break;
        case 'doctor-document':
          if (!docType) throw new Error('Document type is required');
          response = await uploadDoctorDocument(
            fileUri,
            docType as 'degree_certificate' | 'id_proof' | 'medical_registration_certificate'
          );
          break;
        case 'hospital-logo':
          response = await uploadHospitalLogo(fileUri);
          break;
        case 'hospital-license':
          response = await uploadHospitalLicense(fileUri);
          break;
        default:
          return;
      }

      Alert.alert('Success', response.message);
      onUploadSuccess?.(response);
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload file');
      onUploadError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePress = () => {
    if (type === 'image') {
      handleImagePicker();
    } else if (type === 'document') {
      handleDocumentPicker();
    } else {
      // Show options for both
      Alert.alert('Select File Type', 'Choose file type', [
        { text: 'Image', onPress: handleImagePicker },
        { text: 'Document', onPress: handleDocumentPicker },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View>
      {selectedImage && type === 'image' && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
          <Text style={styles.previewText}>Image selected</Text>
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.button,
          { borderColor },
          loading && styles.buttonDisabled,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator color={iconColor} size="small" />
            <ThemedText style={styles.label}>Uploading...</ThemedText>
          </>
        ) : (
          <>
            <MaterialIcons name="cloud-upload" size={20} color={iconColor} style={styles.icon} />
            <ThemedText style={styles.label}>{label}</ThemedText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
  },
  previewContainer: {
    marginBottom: 12,
    alignItems: 'center',
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 8,
  },
  previewText: {
    fontSize: 12,
    color: '#0a7ea4',
    fontWeight: '600',
  },
});

