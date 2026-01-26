import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, BASE_BACKEND_URL } from '../../../config/api';
import { ArrowLeft, Edit, Trash2, FileText, Mail, Phone, MapPin, User } from 'lucide-react-native';

export default function DoctorDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadDoctor();
    }, [id])
  );

  const loadDoctor = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/doctors/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setDoctor(response.data.doctor);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load doctor details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to delete ${doctor?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('admin_token');
              await axios.delete(`${API_BASE_URL}/admin/doctors/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              Alert.alert('Success', 'Doctor deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete doctor');
            }
          },
        },
      ]
    );
  };

  const openFile = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Error', 'Could not open file');
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e293b" />
        </View>
      </SafeAreaView>
    );
  }

  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Doctor not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/admin/doctors/${id}/edit`)}
            style={styles.editButton}
          >
            <Edit size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
            <Trash2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            {doctor.profile_photo ? (
              <Image
                source={{
                  uri: doctor.profile_photo.startsWith('http')
                    ? doctor.profile_photo
                    : `${BASE_BACKEND_URL}/app/${doctor.profile_photo}`,
                }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profilePlaceholder}>
                <User size={40} color="#2563eb" />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{doctor.name}</Text>
              {doctor.specialization && (
                <Text style={styles.profileSpecialization}>{doctor.specialization}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <DetailRow icon={<Mail size={18} color="#64748b" />} label="Email" value={doctor.email} />
          <DetailRow icon={<Phone size={18} color="#64748b" />} label="Phone" value={doctor.phone_number || 'N/A'} />
          <DetailRow icon={<MapPin size={18} color="#64748b" />} label="Location" value={doctor.current_location || 'N/A'} />
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Information</Text>
          <DetailRow label="Qualifications" value={doctor.qualifications || 'N/A'} />
          <DetailRow label="Experience" value={doctor.experience || 'N/A'} />
          <DetailRow label="Medical Council Reg No" value={doctor.medical_council_reg_no || 'N/A'} />
          <DetailRow label="Current Hospital" value={doctor.current_hospital || 'N/A'} />
          <DetailRow label="Preferred Work Type" value={doctor.preferred_work_type || 'N/A'} />
          <DetailRow label="Preferred Location" value={doctor.preferred_location || 'N/A'} />
          {doctor.professional_achievements && (
            <View style={styles.textDetail}>
              <Text style={styles.label}>Professional Achievements</Text>
              <Text style={styles.textValue}>{doctor.professional_achievements}</Text>
            </View>
          )}
        </View>

        {/* Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents</Text>
          {doctor.degree_certificate && (
            <TouchableOpacity
              style={styles.documentRow}
              onPress={() => openFile(doctor.degree_certificate)}
            >
              <FileText size={18} color="#2563eb" />
              <Text style={styles.documentText}>Degree Certificate</Text>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          )}
          {doctor.id_proof && (
            <TouchableOpacity
              style={styles.documentRow}
              onPress={() => openFile(doctor.id_proof)}
            >
              <FileText size={18} color="#2563eb" />
              <Text style={styles.documentText}>ID Proof</Text>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          )}
          {doctor.medical_registration_certificate && (
            <TouchableOpacity
              style={styles.documentRow}
              onPress={() => openFile(doctor.medical_registration_certificate)}
            >
              <FileText size={18} color="#2563eb" />
              <Text style={styles.documentText}>Medical Registration Certificate</Text>
              <Text style={styles.viewText}>View</Text>
            </TouchableOpacity>
          )}
          {!doctor.degree_certificate && !doctor.id_proof && !doctor.medical_registration_certificate && (
            <Text style={styles.noDocuments}>No documents uploaded</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: any) {
  return (
    <View style={styles.detailRow}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.detailContent}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: -0.3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  profilePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: -0.5,
  },
  profileSpecialization: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  value: {
    fontSize: 15,
    color: '#1e293b',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    lineHeight: 22,
  },
  textDetail: {
    marginBottom: 16,
  },
  textValue: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  documentText: {
    flex: 1,
    fontSize: 15,
    color: '#1e293b',
    marginLeft: 12,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  viewText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  noDocuments: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
});

