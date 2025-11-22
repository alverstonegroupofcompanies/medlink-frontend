import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import API from '../app/api';

export interface UploadResponse {
  message: string;
  profile_photo?: string;
  profile_photo_url?: string;
  document_path?: string;
  document_url?: string;
  logo_path?: string;
  logo_url?: string;
  document_type?: string;
  errors?: Record<string, string[]>;
}

/**
 * Pick an image from device library
 */
export const pickImage = async (): Promise<string | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    throw error;
  }
};

/**
 * Take a photo using camera
 */
export const takePhoto = async (): Promise<string | null> => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};

/**
 * Pick a document (PDF, images)
 */
export const pickDocument = async (): Promise<string | null> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking document:', error);
    throw error;
  }
};

/**
 * Upload doctor profile photo
 */
export const uploadDoctorPhoto = async (imageUri: string): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    
    // Get file info
    const filename = imageUri.split('/').pop() || 'profile.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('profile_photo', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      name: filename,
      type,
    } as any);

    const response = await API.post('/doctor/upload/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Doctor photo upload error:', error);
    throw {
      message: error.response?.data?.message || 'Failed to upload photo',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Upload doctor document
 */
export const uploadDoctorDocument = async (
  documentUri: string,
  documentType: 'degree_certificate' | 'id_proof' | 'medical_registration_certificate'
): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    
    // Get file info
    const filename = documentUri.split('/').pop() || 'document.pdf';
    const match = /\.(\w+)$/.exec(filename);
    const type = match && match[1].toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg';

    formData.append('document_type', documentType);
    formData.append('document', {
      uri: Platform.OS === 'ios' ? documentUri.replace('file://', '') : documentUri,
      name: filename,
      type,
    } as any);

    const response = await API.post('/doctor/upload/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Doctor document upload error:', error);
    throw {
      message: error.response?.data?.message || 'Failed to upload document',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Upload hospital logo
 */
export const uploadHospitalLogo = async (imageUri: string): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    
    // Get file info
    const filename = imageUri.split('/').pop() || 'logo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('logo', {
      uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
      name: filename,
      type,
    } as any);

    const response = await API.post('/hospital/upload/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Hospital logo upload error:', error);
    throw {
      message: error.response?.data?.message || 'Failed to upload logo',
      errors: error.response?.data?.errors,
    };
  }
};

/**
 * Upload hospital license document
 */
export const uploadHospitalLicense = async (documentUri: string): Promise<UploadResponse> => {
  try {
    const formData = new FormData();
    
    // Get file info
    const filename = documentUri.split('/').pop() || 'license.pdf';
    const match = /\.(\w+)$/.exec(filename);
    const type = match && match[1].toLowerCase() === 'pdf' ? 'application/pdf' : 'image/jpeg';

    formData.append('license_document', {
      uri: Platform.OS === 'ios' ? documentUri.replace('file://', '') : documentUri,
      name: filename,
      type,
    } as any);

    const response = await API.post('/hospital/upload/license', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Hospital license upload error:', error);
    throw {
      message: error.response?.data?.message || 'Failed to upload license',
      errors: error.response?.data?.errors,
    };
  }
};
