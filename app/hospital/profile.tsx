import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
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
  User,
  Eye,
  CreditCard,
  Settings,
  ChevronRight,
  Camera,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import API from '../api';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { BASE_BACKEND_URL } from '@/config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDoctorLoggedIn } from '@/utils/auth';
import { ModernCard } from '@/components/modern-card';
import { CollapsibleSection } from '@/components/CollapsibleSection';
import { getFullImageUrl } from '@/utils/url-helper';

const HOSPITAL_INFO_KEY = 'hospitalInfo';
const CONTENT_MAX_WIDTH = 720;
const { width } = Dimensions.get('window');

export default function HospitalProfileScreen() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasDoctorAccess, setHasDoctorAccess] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();
  const scrollRef = useRef<ScrollView>(null);
  const [sectionY, setSectionY] = useState<Record<string, number>>({});

  // Safe layout handler to prevent null reference errors
  const handleSectionLayout = (key: string) => (e: any) => {
    // Persist event to prevent nullification
    if (e && typeof e.persist === 'function') {
      e.persist();
    }
    
    // Extract layout value immediately and synchronously
    let layoutY: number | null = null;
    try {
      if (e?.nativeEvent?.layout?.y != null) {
        layoutY = e.nativeEvent.layout.y;
      }
    } catch (error) {
      // Event already nullified, ignore
      return;
    }
    
    // Validate and update state with extracted value
    if (layoutY != null && typeof layoutY === 'number' && !isNaN(layoutY) && isFinite(layoutY)) {
      setSectionY((prev) => ({ ...prev, [key]: layoutY }));
    }
  };

  const scrollToSection = (key: string) => {
    const y = sectionY[key];
    if (y != null && scrollRef.current) {
      scrollRef.current.scrollTo({ y: Math.max(0, y - 12), animated: true });
    }
  };

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
      
      // Debug: Log image URLs
      if (__DEV__) {
        console.log('🏥 Hospital Profile Loaded:');
        console.log('  Cover Image URL:', hospitalData.hospital_picture_url || hospitalData.hospital_picture);
        console.log('  Logo URL:', hospitalData.logo_url || hospitalData.logo_path);
      }
      
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
        return PrimaryColors.main;
      case 'pending':
        return PrimaryColors.light;
      case 'rejected':
        return NeutralColors.textSecondary;
      default:
        return NeutralColors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={20} color={PrimaryColors.main} />;
      case 'pending':
        return <Clock size={20} color={PrimaryColors.light} />;
      case 'rejected':
        return <XCircle size={20} color={NeutralColors.textSecondary} />;
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
        
        {/* LinkedIn-style Header: Cover image with profile picture overlay */}
        <View style={styles.linkedInHeader}>
          {/* Cover Image */}
          <View style={styles.coverImageContainer}>
            {hospital.hospital_picture_url || hospital.hospital_picture ? (
              <Image
                key={`cover-${hospital.id}-${hospital.hospital_picture_url || hospital.hospital_picture}`}
                source={{ 
                  uri: (() => {
                    const rawSrc = hospital.hospital_picture_url || hospital.hospital_picture;
                    const fullUrl = getFullImageUrl(rawSrc);
                    // Add cache busting
                    return fullUrl.includes('?') ? `${fullUrl}&t=${Date.now()}` : `${fullUrl}?t=${Date.now()}`;
                  })()
                }}
                style={styles.coverImage}
                resizeMode="cover"
                onError={(e) => {
                  console.error('❌ Cover image load error:', e.nativeEvent.error);
                  const rawSrc = hospital.hospital_picture_url || hospital.hospital_picture;
                  console.error('   Raw source:', rawSrc);
                  console.error('   Full URL:', getFullImageUrl(rawSrc));
                }}
                onLoad={() => {
                  if (__DEV__) {
                    console.log('✅ Cover image loaded successfully');
                  }
                }}
              />
            ) : (
              <View style={[styles.coverImage, styles.coverImagePlaceholder]}>
                <Building2 size={48} color={PrimaryColors.main} />
              </View>
            )}
            {/* Edit cover button - top right */}
            <TouchableOpacity 
              style={styles.editCoverButton}
              onPress={() => router.push('/hospital/profile/edit')}
              activeOpacity={0.8}
            >
              <Camera size={18} color="#fff" />
              <Text style={styles.editCoverButtonText}>Edit Cover</Text>
            </TouchableOpacity>
          </View>
          
          {/* Profile Picture Overlay - bottom left */}
          <View style={styles.profilePictureContainer}>
            <View style={styles.profilePictureWrapper}>
              {hospital.logo_url || hospital.logo_path ? (
                <Image
                  key={`logo-${hospital.id}-${hospital.logo_url || hospital.logo_path}`}
                  source={{ 
                    uri: (() => {
                      const rawSrc = hospital.logo_url || hospital.logo_path;
                      const fullUrl = getFullImageUrl(rawSrc);
                      // Add cache busting
                      return fullUrl.includes('?') ? `${fullUrl}&t=${Date.now()}` : `${fullUrl}?t=${Date.now()}`;
                    })()
                  }}
                  style={styles.profilePicture}
                  resizeMode="cover"
                  onError={(e) => {
                    console.error('❌ Profile picture load error:', e.nativeEvent.error);
                    const rawSrc = hospital.logo_url || hospital.logo_path;
                    console.error('   Raw source:', rawSrc);
                    console.error('   Full URL:', getFullImageUrl(rawSrc));
                  }}
                  onLoad={() => {
                    if (__DEV__) {
                      console.log('✅ Profile picture loaded successfully');
                    }
                  }}
                />
              ) : (
                <View style={[styles.profilePicture, styles.profilePicturePlaceholder]}>
                  <Building2 size={40} color={PrimaryColors.main} />
                </View>
              )}
              {/* Edit profile picture button - bottom right corner */}
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={() => router.push('/hospital/profile/edit')}
                activeOpacity={0.8}
              >
                <Camera size={14} color="#fff" />
              </TouchableOpacity>
            </View>
            {/* Hospital Name */}
            <Text style={styles.hospitalName}>{hospital.name || 'Hospital Name'}</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding + 20, paddingTop: 16 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Quick access grid: Payments, Settings, Edit */}
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickGridItem} onPress={() => router.push('/hospital/payments')} activeOpacity={0.7}>
              <CreditCard size={22} color={PrimaryColors.main} />
              <Text style={styles.quickGridLabel}>Payments</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickGridItem} onPress={() => router.push('/hospital/settings')} activeOpacity={0.7}>
              <Settings size={22} color={PrimaryColors.main} />
              <Text style={styles.quickGridLabel}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickGridItem} onPress={() => router.push('/hospital/profile/edit')} activeOpacity={0.7}>
              <Edit size={22} color={PrimaryColors.main} />
              <Text style={styles.quickGridLabel}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Informational cards: Verification */}
          <View style={styles.infoCard}>
            <View style={styles.infoCardContent}>
              <Text style={styles.infoCardTitle}>Verification</Text>
              <Text style={styles.infoCardDesc}>
                {hospital.verification_status === 'approved' ? 'Verified' : 
                 hospital.verification_status === 'rejected' ? 'Rejected' : 'Pending Verification'}
              </Text>
            </View>
            <View style={styles.infoCardIcon}>
              {hospital.verification_status === 'approved' ? (
                <CheckCircle size={28} color={PrimaryColors.main} />
              ) : hospital.verification_status === 'rejected' ? (
                <XCircle size={28} color={NeutralColors.textSecondary} />
              ) : (
                <Clock size={28} color={PrimaryColors.light} />
              )}
            </View>
          </View>

          {/* Basic Information */}
          <CollapsibleSection
            title="Basic Information"
            subtitle="Name, email, phone, address"
            icon={Building2}
            iconColor={PrimaryColors.main}
          >
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
          </CollapsibleSection>

          {/* License Information */}
          {(hospital.license_number || hospital.license_status) && (
            <CollapsibleSection
              title="License Information"
              subtitle="License number and status"
              icon={Shield}
              iconColor={PrimaryColors.main}
            >
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
            </CollapsibleSection>
          )}

          {/* Switch Account Section */}
          {hasDoctorAccess && (
            <CollapsibleSection
              title="Switch Account"
              subtitle="Switch to Doctor"
              icon={User}
              iconColor={PrimaryColors.main}
            >
              <TouchableOpacity 
                style={styles.switchButton}
                onPress={handleSwitchToDoctor}
                activeOpacity={0.8}
              >
                <User size={18} color="#2563EB" />
                <Text style={styles.switchButtonText}>Switch to Doctor Portal</Text>
              </TouchableOpacity>
              <Text style={styles.switchHint}>
                Access your doctor dashboard and view job opportunities.
              </Text>
            </CollapsibleSection>
          )}

          {/* Security Section */}
          <CollapsibleSection
            title="Security"
            subtitle="Change password"
            icon={Lock}
            iconColor={PrimaryColors.main}
          >
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => Alert.alert('Change Password', 'Password change feature coming soon.')}
              activeOpacity={0.8}
            >
              <Lock size={18} color={PrimaryColors.main} />
              <Text style={styles.actionButtonText}>Change Password</Text>
            </TouchableOpacity>
          </CollapsibleSection>

          {/* Support Section */}
          <CollapsibleSection
            title="Support"
            subtitle="Email and phone"
            icon={Phone}
            iconColor={PrimaryColors.main}
          >
            <Text style={styles.supportDescription}>
              Need help? Contact our support team for assistance
            </Text>
            
            <View style={styles.supportRow}>
              <View style={styles.supportIconWrapper}>
                <Mail size={20} color={PrimaryColors.main} />
              </View>
              <View style={styles.supportContent}>
                <Text style={styles.supportLabel}>Email</Text>
                <Text style={styles.supportValue}>support@alverconnect.com</Text>
              </View>
            </View>
            
            <View style={[styles.supportRow, styles.lastDetailRow]}>
              <View style={styles.supportIconWrapper}>
                <Phone size={20} color={PrimaryColors.main} />
              </View>
              <View style={styles.supportContent}>
                <Text style={styles.supportLabel}>Phone</Text>
                <Text style={styles.supportValue}>+91 1800-123-4567</Text>
              </View>
            </View>
          </CollapsibleSection>
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
  // LinkedIn-style header
  linkedInHeader: {
    marginTop: 0,
    backgroundColor: '#fff',
    marginBottom: 0,
  },
  coverImageContainer: {
    width: '100%',
    height: 200,
    backgroundColor: PrimaryColors.light,
    position: 'relative',
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    backgroundColor: PrimaryColors.light,
  },
  coverImagePlaceholder: {
    backgroundColor: PrimaryColors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editCoverButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 10,
  },
  editCoverButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  profilePictureContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    marginTop: -60,
  },
  profilePictureWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  profilePicturePlaceholder: {
    backgroundColor: PrimaryColors.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editProfileButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PrimaryColors.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  hospitalName: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 8,
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
  quickGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  quickGridItem: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickGridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  infoCardDesc: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  infoCardIcon: {
    marginLeft: 12,
  },
  optionsList: {
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  optionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
  },
  profileCard: {
    marginBottom: 20,
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
    color: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  supportIconContainer: {
    backgroundColor: '#DBEAFE',
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
    borderBottomColor: '#DBEAFE',
  },
  supportIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DBEAFE',
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
    color: PrimaryColors.main,
    fontWeight: '600',
  },
});



