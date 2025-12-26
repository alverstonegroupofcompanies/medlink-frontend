import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, Linking, Platform, Text, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { HospitalPrimaryColors } from '@/constants/hospital-theme';
import { AlertCircle } from 'lucide-react-native';

interface PermissionGuardProps {
  permissionType: 'location' | 'camera' | 'mediaLibrary';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  autoRequest?: boolean;
}

/**
 * A wrapper component that ensures permissions are granted before rendering children.
 * If permission is missing, it shows a friendly UI or nothing (depending on fallback).
 */
export function PermissionGuard({ 
  permissionType, 
  children, 
  fallback,
  autoRequest = false 
}: PermissionGuardProps) {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  type PermissionStatus = 'granted' | 'denied' | 'undetermined';

  useEffect(() => {
    checkPermission();
  }, []);

  const checkPermission = async () => {
    try {
      let result;
      if (permissionType === 'location') {
        result = await Location.getForegroundPermissionsAsync();
      } else if (permissionType === 'camera') {
        result = await ImagePicker.getCameraPermissionsAsync();
      } else {
        result = await ImagePicker.getMediaLibraryPermissionsAsync();
      }

      setStatus(result.status as PermissionStatus);
      
      // Auto request if undetermined and autoRequest is true
      if (result.status === 'undetermined' && autoRequest) {
        requestPermission();
      }
    } catch (error) {
      console.error(`Error checking ${permissionType} permission:`, error);
      setStatus('denied');
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      let result;
      if (permissionType === 'location') {
        result = await Location.requestForegroundPermissionsAsync();
      } else if (permissionType === 'camera') {
        result = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        result = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      setStatus(result.status as PermissionStatus);

      if (result.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          `We need access to your ${permissionType} to use this feature. Please enable it in settings.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    } catch (error) {
      console.error(`Error requesting ${permissionType} permission:`, error);
      Alert.alert('Error', 'Failed to request permission');
    }
  };

  if (loading) {
    return <View />; // Or a spinner
  }

  if (status === 'granted') {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  // Default fallback UI
  return (
    <View style={styles.container}>
      <AlertCircle size={32} color="#666" />
      <Text style={styles.text}>
        {permissionType === 'location' ? 'Location access needed' : 
         permissionType === 'camera' ? 'Camera access needed' : 'Photo access needed'}
      </Text>
      <TouchableOpacity style={styles.button} onPress={requestPermission}>
        <Text style={styles.buttonText}>Allow Access</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed'
  },
  text: {
    marginTop: 12,
    marginBottom: 16,
    color: '#666',
    fontSize: 14,
    fontWeight: '500'
  },
  button: {
    backgroundColor: HospitalPrimaryColors.main || '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  }
});
