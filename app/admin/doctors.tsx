import React, { useEffect, useState } from 'react';
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
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { User, Search, Plus, Eye, Edit, Trash2, ArrowLeft } from 'lucide-react-native';

export default function DoctorsList() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadDoctors();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadDoctors = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      // Use the new endpoint that includes application statuses
      const response = await axios.get(`${API_BASE_URL}/admin/doctors-with-status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setDoctors(response.data.doctors || []);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load doctors');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to delete ${name}?`,
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
              Alert.alert('Success', 'Doctor deleted successfully');
              loadDoctors();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete doctor');
            }
          },
        },
      ]
    );
  };

  const filteredDoctors = doctors.filter((doctor) =>
    doctor.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doctor.specialization?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e293b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctors</Text>
        <TouchableOpacity
          onPress={() => router.push('/admin/doctors/create')}
          style={styles.addButton}
        >
          <Plus size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search doctors by name, email, or specialization..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#94a3b8"
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadDoctors} />
        }
      >
        {filteredDoctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <User size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>No doctors found</Text>
            <TouchableOpacity
              style={styles.addFirstButton}
              onPress={() => router.push('/admin/doctors/create')}
            >
              <Text style={styles.addFirstButtonText}>Add First Doctor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredDoctors.map((doctor) => (
            <View key={doctor.id} style={styles.doctorCard}>
              <View style={styles.doctorInfo}>
                <View style={styles.avatar}>
                  <User size={24} color="#2563eb" />
                </View>
                <View style={styles.doctorDetails}>
                  <Text style={styles.doctorName}>{doctor.name}</Text>
                  <Text style={styles.doctorEmail}>{doctor.email}</Text>
                  {doctor.specialization && (
                    <Text style={styles.doctorSpecialization}>{doctor.specialization}</Text>
                  )}
                  {/* Application Status Info */}
                  <View style={styles.statusInfo}>
                    <Text style={styles.statusText}>
                      Applied: {doctor.applications_count || 0} | 
                      Approved: {doctor.approved_applications || 0} | 
                      Rejected: {doctor.rejected_applications || 0}
                    </Text>
                    {doctor.average_rating > 0 && (
                      <Text style={styles.ratingText}>
                        Rating: {doctor.average_rating} ({doctor.total_ratings} ratings)
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/admin/doctors/${doctor.id}`)}
                >
                  <Eye size={18} color="#2563eb" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => router.push(`/admin/doctors/${doctor.id}/edit`)}
                >
                  <Edit size={18} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(doctor.id, doctor.name)}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
    letterSpacing: -0.3,
  },
  addButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  addFirstButton: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
    letterSpacing: 0.3,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: Platform.select({ 
      ios: 'Poppins-SemiBold', 
      android: 'Poppins-SemiBold',
      default: 'Poppins-SemiBold'
    }),
  },
  doctorEmail: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
    fontFamily: Platform.select({ 
      ios: 'Inter-Regular', 
      android: 'Inter-Regular',
      default: 'Inter-Regular'
    }),
  },
  doctorSpecialization: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  statusInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  ratingText: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 2,
    fontFamily: Platform.select({ ios: 'Roboto', android: 'Roboto' }),
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});

