import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  User,
  Eye,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../api';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { BASE_BACKEND_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDoctorLoggedIn } from '@/utils/auth';
import { ModernCard } from '@/components/modern-card';

const HOSPITAL_INFO_KEY = 'hospitalInfo';
const CONTENT_MAX_WIDTH = 720;
const { width } = Dimensions.get('window');

export default function HospitalProfileScreen() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasDoctorAccess, setHasDoctorAccess] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();

  useEffect(() => {
    checkDoctorAccess();
  }, []);

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
      const status = error?.response?.status;

      // If unauthorized, redirect to hospital login (prevents "Profile not found" confusion)
      if (status === 401) {
        try {
          await AsyncStorage.removeItem('hospitalToken');
        } catch {}
        router.replace('/login');
        return;
      }

      // Fallback to cached profile (helps when network is flaky)
      try {
        const cached = await AsyncStorage.getItem(HOSPITAL_INFO_KEY);
        if (cached) {
          setHospital(JSON.parse(cached));
          return;
        }
      } catch {}

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

  const checkDoctorAccess = async () => {
    try {
      const doctorLoggedIn = await isDoctorLoggedIn();
      setHasDoctorAccess(doctorLoggedIn);
    } catch (error) {
      console.error('Error checking doctor access:', error);
    }
  };

  const handleSwitchToDoctor = async () => {
    try {
      const doctorLoggedIn = await isDoctorLoggedIn();
      if (doctorLoggedIn) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(
          'Doctor Login Required',
          'You need to login as a doctor to access the doctor portal.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Login', 
              onPress: () => router.push('/login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error switching to doctor:', error);
      Alert.alert('Error', 'Failed to switch to doctor view');
    }
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
        <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
        
        {/* Cover Header (Hospital Image) */}
        <View style={styles.headerGradient}>
          {hospital.hospital_picture_url || hospital.hospital_picture ? (
            <ImageBackground
              source={{
                uri:
                  hospital.hospital_picture_url ||
                  `${BASE_BACKEND_URL}/app/${hospital.hospital_picture}`,
              }}
              style={styles.coverImage}
              resizeMode="cover"
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.45)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.6)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.coverDim}
              />
            </ImageBackground>
          ) : (
            <LinearGradient
              colors={[PrimaryColors.dark, PrimaryColors.main]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverImage}
            />
          )}

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={() => router.push('/hospital/profile/edit')} style={styles.editButton}>
              <Edit size={20} color={PrimaryColors.main} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding + 20 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Uploaded Images */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Building2 size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>Images</Text>
            </View>

            <View style={styles.imagesRow}>
              <View style={styles.imageItem}>
                <Text style={styles.imageLabel}>Logo / Profile</Text>
                {hospital.logo_url || hospital.logo_path ? (
                  <Image
                    source={{ uri: hospital.logo_url || `${BASE_BACKEND_URL}/app/${hospital.logo_path}` }}
                    style={styles.thumbCircle}
                  />
                ) : (
                  <View style={[styles.thumbCircle, styles.thumbPlaceholder]}>
                    <Building2 size={22} color={PrimaryColors.main} />
                  </View>
                )}
              </View>

              <View style={styles.imageItem}>
                <Text style={styles.imageLabel}>Cover</Text>
                {hospital.hospital_picture_url || hospital.hospital_picture ? (
                  <Image
                    source={{ uri: hospital.hospital_picture_url || `${BASE_BACKEND_URL}/app/${hospital.hospital_picture}` }}
                    style={styles.thumbCover}
                  />
                ) : (
                  <View style={[styles.thumbCover, styles.thumbPlaceholder]}>
                    <Building2 size={22} color={PrimaryColors.main} />
                  </View>
                )}
              </View>
            </View>
          </ModernCard>

          {/* Profile Card with Modern Design */}
          <ModernCard variant="elevated" style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.logoContainer}>
                {hospital.logo_url || hospital.logo_path ? (
                  <Image
                    source={{
                      uri: hospital.logo_url || `${BASE_BACKEND_URL}/app/${hospital.logo_path}`,
                    }}
                    style={styles.logo}
                  />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Building2 size={48} color={PrimaryColors.main} />
                  </View>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.hospitalName}>{hospital.name || 'Hospital Name'}</Text>
                <Text style={styles.hospitalEmail}>{hospital.email || 'No email'}</Text>
                
                {/* Verification Status Badge */}
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(hospital.verification_status || 'pending')}15` }]}>
                  {getStatusIcon(hospital.verification_status || 'pending')}
                  <Text style={[styles.statusText, { color: getStatusColor(hospital.verification_status || 'pending') }]}>
                    {hospital.verification_status === 'approved' ? 'Verified' : 
                     hospital.verification_status === 'rejected' ? 'Rejected' : 'Pending Verification'}
                  </Text>
                </View>
              </View>
            </View>
          </ModernCard>

          {/* Basic Information */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Building2 size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            
            <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Building2 size={18} color={PrimaryColors.main} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Hospital Name</Text>
                <Text style={styles.detailValue}>{hospital.name || 'N/A'}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.iconWrapper}>
                <Mail size={18} color={PrimaryColors.main} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{hospital.email || 'N/A'}</Text>
              </View>
            </View>

            {hospital.phone_number && (
              <View style={styles.detailRow}>
                <View style={styles.iconWrapper}>
                  <Phone size={18} color={PrimaryColors.main} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Phone Number</Text>
                  <Text style={styles.detailValue}>{hospital.phone_number}</Text>
                </View>
              </View>
            )}

            {hospital.address && (
              <View style={styles.detailRow}>
                <View style={styles.iconWrapper}>
                  <MapPin size={18} color={PrimaryColors.main} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Address</Text>
                  <Text style={styles.detailValue}>{hospital.address}</Text>
                </View>
              </View>
            )}

            {/* Coordinates intentionally hidden (show address only) */}
          </ModernCard>

          {/* License Information */}
          {(hospital.license_number || hospital.license_status) && (
            <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <Shield size={20} color={PrimaryColors.main} />
                </View>
                <Text style={styles.sectionTitle}>License Information</Text>
              </View>
              
              {hospital.license_number && (
                <View style={styles.detailRow}>
                  <View style={styles.iconWrapper}>
                    <FileText size={18} color={PrimaryColors.main} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>License Number</Text>
                    <Text style={styles.detailValue}>{hospital.license_number}</Text>
                  </View>
                </View>
              )}

              {hospital.license_status && (
                <View style={[styles.detailRow, styles.lastDetailRow]}>
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
                  <Eye size={18} color={PrimaryColors.main} />
                  <Text style={styles.documentButtonText}>View License Document</Text>
                </TouchableOpacity>
              ) : null}
            </ModernCard>
          )}

          {/* Switch Account Section */}
          {hasDoctorAccess && (
            <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconContainer}>
                  <User size={20} color={PrimaryColors.main} />
                </View>
                <Text style={styles.sectionTitle}>Switch Account</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={handleSwitchToDoctor}
                activeOpacity={0.8}
              >
                <User size={18} color="#0066FF" />
                <Text style={styles.switchButtonText}>Switch to Doctor Portal</Text>
              </TouchableOpacity>
              <Text style={styles.switchHint}>
                Access your doctor dashboard and view job opportunities.
              </Text>
            </ModernCard>
          )}

          {/* Security Section */}
          <ModernCard variant="elevated" padding="md" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <Lock size={20} color={PrimaryColors.main} />
              </View>
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Change Password', 'Password change feature coming soon.')}
              activeOpacity={0.8}
            >
              <Lock size={18} color={PrimaryColors.main} />
              <Text style={styles.actionButtonText}>Change Password</Text>
            </TouchableOpacity>
          </ModernCard>

          {/* Support Section - Modern Design */}
          <ModernCard variant="elevated" padding="md" style={[styles.sectionCard, styles.supportCard]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconContainer, styles.supportIconContainer]}>
                <Phone size={20} color="#10B981" />
              </View>
              <Text style={styles.sectionTitle}>Support</Text>
            </View>
            
            <Text style={styles.supportDescription}>
              Need help? Contact our support team for assistance
            </Text>
            
            <View style={styles.supportRow}>
              <View style={styles.supportIconWrapper}>
                <Mail size={20} color="#10B981" />
              </View>
              <View style={styles.supportContent}>
                <Text style={styles.supportLabel}>Email</Text>
                <Text style={styles.supportValue}>support@alverconnect.com</Text>
              </View>
            </View>
            
            <View style={[styles.supportRow, styles.lastDetailRow]}>
              <View style={styles.supportIconWrapper}>
                <Phone size={20} color="#10B981" />
              </View>
              <View style={styles.supportContent}>
                <Text style={styles.supportLabel}>Phone</Text>
                <Text style={styles.supportValue}>+91 1800-123-4567</Text>
              </View>
            </View>
          </ModernCard>
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
  coverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  coverDim: {
    ...StyleSheet.absoluteFillObject,
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
  headerGradient: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    minHeight: 180,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 24,
    width: '100%',
    maxWidth: width >= 768 ? CONTENT_MAX_WIDTH : '100%',
    alignSelf: 'center',
  },
  profileCard: {
    marginBottom: 20,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 14,
  },
  imageItem: {
    flex: 1,
    gap: 10,
  },
  imageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
  },
  thumbCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  thumbCover: {
    width: '100%',
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  thumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: `${PrimaryColors.main}10`,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: PrimaryColors.main,
    backgroundColor: NeutralColors.background,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: PrimaryColors.main,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  hospitalName: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
    textAlign: 'center',
  },
  hospitalEmail: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  lastDetailRow: {
    borderBottomWidth: 0,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: NeutralColors.textPrimary,
    lineHeight: 22,
    fontWeight: '500',
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
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${PrimaryColors.main}10`,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchButtonText: {
    color: '#0066FF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  supportCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  supportIconContainer: {
    backgroundColor: '#D1FAE5',
  },
  supportDescription: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  supportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D1FAE5',
  },
  supportIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportContent: {
    flex: 1,
  },
  supportLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    marginBottom: 4,
  },
  supportValue: {
    fontSize: 15,
    color: '#059669',
    fontWeight: '600',
  },
});



