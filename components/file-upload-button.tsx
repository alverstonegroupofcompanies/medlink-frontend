import { TouchableOpacity, StyleSheet, Text, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from './themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';

type FileUploadButtonProps = {
  label: string;
  onFileSelected: (uri: string, name: string) => void;
  type?: 'image' | 'document' | 'both';
  acceptedTypes?: string[];
};

export function FileUploadButton({
  label,
  onFileSelected,
  type = 'both',
  acceptedTypes,
}: FileUploadButtonProps) {
  const colorScheme = useColorScheme();
  const borderColor = colorScheme === 'dark' ? '#374151' : '#e5e7eb';
  const iconColor = colorScheme === 'dark' ? '#9BA1A6' : '#6b7280';

  const handleImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        onFileSelected(result.assets[0].uri, result.assets[0].fileName || 'image.jpg');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleDocumentPicker = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes || '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        onFileSelected(result.assets[0].uri, result.assets[0].name);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
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
    <TouchableOpacity
      style={[styles.button, { borderColor }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <MaterialIcons name="cloud-upload" size={20} color={iconColor} style={styles.icon} />
      <ThemedText style={styles.label}>{label}</ThemedText>
    </TouchableOpacity>
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
  icon: {
    marginRight: 8,
  },
  label: {
    fontSize: 16,
  },
});

