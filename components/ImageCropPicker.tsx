import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { RotateCw, FlipHorizontal, X, Check, Camera, Image as ImageIcon } from 'lucide-react-native';
import { HospitalDesignColors, Spacing, BorderRadius, Elevation } from '@/constants/hospital-design';

interface ImageCropPickerProps {
  onImageSelected: (uri: string) => void;
  aspectRatio?: [number, number];
  circular?: boolean;
  width?: number;
  height?: number;
  showControls?: boolean;
  initialImage?: string | null;
}

/**
 * Advanced image cropping component with preview and manipulation tools
 * Uses expo-image-picker and expo-image-manipulator for Expo compatibility
 */
export function ImageCropPicker({
  onImageSelected,
  aspectRatio = [1, 1],
  circular = false,
  width = 300,
  height = 300,
  showControls = true,
  initialImage = null,
}: ImageCropPickerProps) {
  const [imageUri, setImageUri] = useState<string | null>(initialImage);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const openPicker = async (source: 'camera' | 'gallery') => {
    try {
      // Request permissions first (don't show processing yet)
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
      }

      // Launch image picker (camera/gallery will open here)
      let result;
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: aspectRatio,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: aspectRatio,
          quality: 0.8,
        });
      }

      // Only show processing when we're actually processing the image
      if (!result.canceled && result.assets[0]) {
        setIsProcessing(true);
        
        try {
          let imageUri = result.assets[0].uri;
          
          // If circular, we need to crop to square first
          if (circular && aspectRatio[0] !== aspectRatio[1]) {
            // Crop to square
            const manipResult = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width: Math.min(width, height), height: Math.min(width, height) } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            imageUri = manipResult.uri;
          } else if (result.assets[0].width && result.assets[0].height) {
            // Resize if needed
            const manipResult = await ImageManipulator.manipulateAsync(
              imageUri,
              [{ resize: { width, height } }],
              { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
            );
            imageUri = manipResult.uri;
          }

          setImageUri(imageUri);
          setShowPreview(true);
          onImageSelected(imageUri);
        } finally {
          setIsProcessing(false);
        }
      }
    } catch (error: any) {
      setIsProcessing(false);
      if (error.message !== 'User cancelled image picker' && !error.message?.includes('cancel')) {
        Alert.alert('Error', `Failed to ${source === 'camera' ? 'take' : 'pick'} image: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const handleRotate = async () => {
    if (!imageUri) return;

    try {
      setIsProcessing(true);
      
      // Rotate image 90 degrees
      const manipResult = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ rotate: 90 }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(manipResult.uri);
      onImageSelected(manipResult.uri);
    } catch (error: any) {
      Alert.alert('Error', `Failed to rotate image: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = () => {
    setImageUri(null);
    setShowPreview(false);
    onImageSelected('');
  };

  const handleConfirm = () => {
    setShowPreview(false);
  };

  if (isProcessing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={HospitalDesignColors.primary} />
        <Text style={styles.processingText}>Processing image...</Text>
      </View>
    );
  }

  if (imageUri && showPreview) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageUri }}
            style={[styles.previewImage, circular && styles.circularImage]}
            resizeMode="cover"
          />
          {showControls && (
            <View style={styles.controlsContainer}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleRotate}
                activeOpacity={0.7}
              >
                <RotateCw size={20} color={HospitalDesignColors.primary} />
                <Text style={styles.controlText}>Rotate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleRemove}
                activeOpacity={0.7}
              >
                <X size={20} color={HospitalDesignColors.error} />
                <Text style={styles.controlText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, styles.confirmButton]}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Check size={20} color="#FFFFFF" />
                <Text style={[styles.controlText, styles.confirmText]}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (imageUri && !showPreview) {
    return (
      <View style={styles.container}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={[styles.image, circular && styles.circularImage]}
            resizeMode="cover"
          />
          <View style={styles.editOverlay}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowPreview(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={handleRemove}
              activeOpacity={0.7}
            >
              <X size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => openPicker('gallery')}
          activeOpacity={0.7}
        >
          <ImageIcon size={24} color={HospitalDesignColors.primary} />
          <Text style={styles.pickerButtonText}>Choose from Gallery</Text>
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
          <TouchableOpacity
            style={[styles.pickerButton, styles.cameraButton]}
            onPress={() => openPicker('camera')}
            activeOpacity={0.7}
          >
            <Camera size={24} color="#FFFFFF" />
            <Text style={[styles.pickerButtonText, styles.cameraButtonText]}>Take Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  processingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  processingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    color: HospitalDesignColors.onSurfaceVariant,
  },
  pickerContainer: {
    gap: Spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: HospitalDesignColors.surfaceVariant,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: HospitalDesignColors.border,
    gap: Spacing.sm,
  },
  pickerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: HospitalDesignColors.primary,
  },
  cameraButton: {
    backgroundColor: HospitalDesignColors.primary,
    borderColor: HospitalDesignColors.primary,
  },
  cameraButtonText: {
    color: '#FFFFFF',
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 150,
    height: 150,
    borderRadius: BorderRadius.lg,
    ...Elevation.level2,
  },
  circularImage: {
    borderRadius: 75,
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
  },
  editButton: {
    backgroundColor: HospitalDesignColors.primary,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    ...Elevation.level2,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    backgroundColor: HospitalDesignColors.error,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.level2,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: 250,
    height: 250,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Elevation.level3,
  },
  controlsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: HospitalDesignColors.surfaceVariant,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: HospitalDesignColors.border,
    gap: Spacing.xs,
    ...Elevation.level1,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
    color: HospitalDesignColors.onSurface,
  },
  confirmButton: {
    backgroundColor: HospitalDesignColors.primary,
    borderColor: HospitalDesignColors.primary,
  },
  confirmText: {
    color: '#FFFFFF',
  },
});
