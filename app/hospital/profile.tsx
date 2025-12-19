import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Edit,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Lock,
  Calendar,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { BASE_BACKEND_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalProfileScreen() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get('/hospital/profile');
      const hospitalData = response.data.hospital;
      setHospital(hospitalData);
      
      // Update stored hospital info
      await AsyncStorage.setItem(HOSPITAL_INFO_KEY, JSON.stringify(hospitalData));
    } catch (error: any) {
      console.error('Error loading hospital profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return StatusColors.success;
      case 'pending':
        return StatusColors.warning;
      case 'rejected':
        return StatusColors.error;
      default:
        return NeutralColors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={20} color={StatusColors.success} />;
      case 'pending':
        return <Clock size={20} color={StatusColors.warning} />;
      case 'rejected':
        return <XCircle size={20} color={StatusColors.error} />;
      default:
        return <Clock size={20} color={NeutralColors.textSecondary} />;
    }
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PrimaryColors.main} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!hospital) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
        <View style={styles.container}>
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Profile not found</Text>
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark} statusBarStyle="light-content">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity 
            onPress={() => router.push('/hospital/profile/edit')} 
            style={styles.editButton}
          >
            <Edit size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.logoContainer}>
              {hospital.logo_url || hospital.logo_path ? (
                <Image
                  source={{
                    uri: hospital.logo_url || `${BASE_BACKEND_URL}/storage/${hospital.logo_path}`,
                  }}
                  style={styles.logo}
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Building2 size={48} color={PrimaryColors.main} />
                </View>
              )}
            </View>
            <Text style={styles.hospitalName}>{hospital.name || 'Hospital Name'}</Text>
            <Text style={styles.hospitalEmail}>{hospital.email || 'No email'}</Text>
            
            {/* Verification Status */}
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(hospital.verification_status || 'pending')}15` }]}>
              {getStatusIcon(hospital.verification_status || 'pending')}
              <Text style={[styles.statusText, { color: getStatusColor(hospital.verification_status || 'pending') }]}>
                {hospital.verification_status === 'approved' ? 'Verified' : 
                 hospital.verification_status === 'rejected' ? 'Rejected' : 'Pending Verification'}
              </Text>
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Basic Information</Text>
            
            <View style={styles.infoRow}>
              <Building2 size={20} color={PrimaryColors.main} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Hospital Name</Text>
                <Text style={styles.infoValue}>{hospital.name || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Mail size={20} color={PrimaryColors.main} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{hospital.email || 'N/A'}</Text>
              </View>
            </View>

            {hospital.phone_number && (
              <View style={styles.infoRow}>
                <Phone size={20} color={PrimaryColors.main} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone Number</Text>
                  <Text style={styles.infoValue}>{hospital.phone_number}</Text>
                </View>
              </View>
            )}

            {hospital.address && (
              <View style={styles.infoRow}>
                <MapPin size={20} color={PrimaryColors.main} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{hospital.address}</Text>
                </View>
              </View>
            )}

            {(hospital.latitude && hospital.longitude) && (
              <View style={styles.infoRow}>
                <MapPin size={20} color={PrimaryColors.main} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {parseFloat(String(hospital.latitude)).toFixed(6)}, {parseFloat(String(hospital.longitude)).toFixed(6)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* License Information */}
          {(hospital.license_number || hospital.license_status) && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Shield size={24} color={PrimaryColors.main} />
                <Text style={styles.cardTitle}>License Information</Text>
              </View>
              
              {hospital.license_number && (
                <View style={styles.infoRow}>
                  <FileText size={20} color={PrimaryColors.main} />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>License Number</Text>
                    <Text style={styles.infoValue}>{hospital.license_number}</Text>
                  </View>
                </View>
              )}

              {hospital.license_status && (
                <View style={styles.infoRow}>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(hospital.license_status)}15` }]}>
                    {getStatusIcon(hospital.license_status)}
                    <Text style={[styles.statusText, { color: getStatusColor(hospital.license_status) }]}>
                      {hospital.license_status === 'verified' ? 'Verified' : 
                       hospital.license_status === 'rejected' ? 'Rejected' : 'Pending'}
                    </Text>
                  </View>
                </View>
              )}

              {hospital.license_document_url || hospital.license_document ? (
                <TouchableOpacity style={styles.documentButton}>
                  <FileText size={18} color={PrimaryColors.main} />
                  <Text style={styles.documentButtonText}>View License Document</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          {/* Quick Access Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Calendar size={24} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Quick Access</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/hospital/live-tracking')}
            >
              <MapPin size={18} color={PrimaryColors.main} />
              <Text style={styles.actionButtonText}>Live Doctor Tracking</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, { marginTop: 12 }]}
              onPress={() => router.push('/hospital/sessions')}
            >
              <Calendar size={18} color={PrimaryColors.main} />
              <Text style={styles.actionButtonText}>View All Sessions</Text>
            </TouchableOpacity>
          </View>

          {/* Security Section */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Lock size={24} color={PrimaryColors.main} />
              <Text style={styles.cardTitle}>Security</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/hospital/profile/password')}
            >
              <Lock size={18} color={PrimaryColors.main} />
              <Text style={styles.actionButtonText}>Change Password</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  header: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
    backgroundColor: PrimaryColors.dark,
    marginHorizontal: -16,
    marginTop: -16,
    paddingTop: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  hospitalName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  hospitalEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    color: NeutralColors.textPrimary,
    lineHeight: 22,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${PrimaryColors.main}10`,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  documentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${PrimaryColors.main}10`,
    borderRadius: 10,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
});



