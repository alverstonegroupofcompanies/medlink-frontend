import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, TouchableOpacity, ActivityIndicator, Modal, Keyboard, Platform, StatusBar } from 'react-native';
import { LogOut, User, Shield, HelpCircle, Info, Building2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import { ModernColors } from '@/constants/modern-theme';
import { logoutDoctor, getDoctorInfo, isHospitalLoggedIn } from '@/utils/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../api';
import { router } from 'expo-router';
import { useSafeBottomPadding } from '@/components/screen-safe-area';

const STORAGE_KEYS = {
  DOCTOR_TOKEN: 'doctorToken',
  DOCTOR_INFO: 'doctorInfo',
};

export default function MoreScreen() {
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [hasHospitalAccess, setHasHospitalAccess] = useState(false);
  const safeBottomPadding = useSafeBottomPadding();

  useEffect(() => {
    loadDoctorInfo();
    checkHospitalAccess();
  }, []);

  const loadDoctorInfo = async () => {
    try {
      const info = await getDoctorInfo();
      if (info) {
        setDoctor(info);
      }
    } catch (error) {
      console.error('Error loading doctor info:', error);
    }
  };

  const checkHospitalAccess = async () => {
    try {
      const hospitalLoggedIn = await isHospitalLoggedIn();
      setHasHospitalAccess(hospitalLoggedIn);
    } catch (error) {
      console.error('Error checking hospital access:', error);
    }
  };

  const handleSwitchToHospital = async () => {
    try {
      const hospitalLoggedIn = await isHospitalLoggedIn();
      if (hospitalLoggedIn) {
        router.replace('/hospital/dashboard');
      } else {
        Alert.alert(
          'Hospital Login Required',
          'You need to login as a hospital to access the hospital portal.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Go to Login', 
              onPress: () => router.push('/hospital/login')
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error switching to hospital:', error);
      Alert.alert('Error', 'Failed to switch to hospital view');
    }
  };

  const performLogout = async () => {
    console.log('✅ Doctor logout confirmed, starting process...');
    setShowLogoutModal(false);
    
    try {
      // 1. Try to call backend logout API to invalidate token
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_TOKEN);
        if (token) {
          console.log('📞 Calling backend logout API...');
          const response = await API.post('/doctor/logout');
          console.log('✅ Backend logout successful');
          console.log('📊 Backend response:', response.data);
          if (response.data?.tokens_deleted) {
            console.log(`🗑️ Deleted ${response.data.tokens_deleted} token(s) from backend`);
          }
        }
      } catch (error: any) {
        console.warn('⚠️ Backend logout failed (continuing with local logout)');
        console.warn('⚠️ Error details:', error?.response?.data || error?.message || error);
        // Don't throw - continue with local logout
      }

      // 2. Clear all local storage - aggressive cleanup
      console.log('🧹 Clearing all login data...');
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.DOCTOR_TOKEN,
        STORAGE_KEYS.DOCTOR_INFO,
        'doctorToken',
        'doctorInfo',
      ]);
      
      // Also try individual removal to ensure it's cleared
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.DOCTOR_INFO);
      await AsyncStorage.removeItem('doctorToken');
      await AsyncStorage.removeItem('doctorInfo');

      // 3. Verify everything is cleared
      const remainingToken = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_TOKEN);
      const remainingInfo = await AsyncStorage.getItem(STORAGE_KEYS.DOCTOR_INFO);
      
      if (remainingToken || remainingInfo) {
        console.warn('⚠️ Data still exists after cleanup');
      } else {
        console.log('✅ All login data cleared successfully');
      }

      console.log('✅ Logout complete - redirecting to login screen');

      // 4. Navigate to login page
      const navigateToLogin = () => {
        try {
          console.log('🔄 Attempting navigation to /login');
          router.dismissAll();
          router.replace('/login');
          console.log('✅ Navigation to login executed');
        } catch (navError) {
          console.error('❌ Navigation error:', navError);
          // Try alternative
          try {
            router.dismissAll();
            router.push('/login');
            console.log('✅ Alternative navigation (push) completed');
          } catch (altError) {
            console.error('❌ Alternative navigation also failed:', altError);
            // Last resort: try root
            try {
              router.dismissAll();
              router.replace('/');
            } catch (rootError) {
              console.error('❌ Root navigation also failed:', rootError);
            }
          }
        }
      };

      // Navigate immediately
      navigateToLogin();
      
      // Also retry after delay
      setTimeout(() => {
        console.log('🔄 Retry navigation to /login after delay...');
        navigateToLogin();
      }, 500);

    } catch (error: any) {
      console.error('❌ Error during logout:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      // Still try to clear storage and navigate even if there's an error
      try {
        await AsyncStorage.multiRemove([
          STORAGE_KEYS.DOCTOR_TOKEN,
          STORAGE_KEYS.DOCTOR_INFO,
          'doctorToken',
          'doctorInfo',
        ]);
        router.dismissAll();
        router.replace('/login');
      } catch (clearError) {
        console.error('❌ Error clearing auth:', clearError);
        // Force navigation
        router.dismissAll();
        router.replace('/login');
      }
    }
  };

  const handleLogout = () => {
    console.log('🔘 Doctor logout button pressed');
    Keyboard.dismiss();
    // Show custom modal instead of Alert
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    console.log('✅ User confirmed doctor logout - starting logout process');
    performLogout();
  };

  const cancelLogout = () => {
    console.log('❌ Doctor logout cancelled by user');
    setShowLogoutModal(false);
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={ModernColors.primary.main} />
      {/* Custom Logout Confirmation Modal - appears on top of everything */}
      <Modal
        visible={showLogoutModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelLogout}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to log out? All your login details will be removed.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={cancelLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.container}>
        {/* Header */}
        <LinearGradient
            colors={ModernColors.primary.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
        >
          <Text style={styles.title}>Settings</Text>
          {doctor && (
            <Text style={styles.subtitle}>
              {doctor.name || doctor.email}
            </Text>
          )}
        </LinearGradient>

        <ScrollView 
          style={[styles.scrollView, { backgroundColor: NeutralColors.background }]}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: safeBottomPadding }]}
        >
          {/* Account Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color={PrimaryColors.main} />
              <Text style={[styles.sectionTitle, { color: PrimaryColors.dark }]}>Account</Text>
            </View>
            <View style={styles.sectionContent}>
              {doctor && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Name:</Text>
                    <Text style={styles.infoValue}>{doctor.name || 'Not set'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{doctor.email || 'Not set'}</Text>
                  </View>
                  {doctor.phone_number && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>{doctor.phone_number}</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Switch Account Section */}
          {hasHospitalAccess && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Building2 size={20} color={PrimaryColors.main} />
                <Text style={[styles.sectionTitle, { color: PrimaryColors.dark }]}>Switch Account</Text>
              </View>
              <View style={styles.sectionContent}>
                <TouchableOpacity 
                  style={styles.switchButton}
                  onPress={handleSwitchToHospital}
                >
                  <Building2 size={20} color="#7B61FF" />
                  <Text style={styles.switchButtonText}>Switch to Hospital Portal</Text>
                </TouchableOpacity>
                <Text style={styles.switchHint}>
                  Access your hospital dashboard and manage staff.
                </Text>
              </View>
            </View>
          )}

          {/* Security Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={20} color={PrimaryColors.main} />
              <Text style={[styles.sectionTitle, { color: PrimaryColors.dark }]}>Security</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity 
                style={styles.logoutButton}
                onPress={handleLogout}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <LogOut size={20} color="#fff" />
                    <Text style={styles.logoutButtonText}>Logout</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.logoutHint}>
                This will remove all your login details and redirect you to the home page.
              </Text>
            </View>
          </View>

          {/* Help Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <HelpCircle size={20} color={PrimaryColors.main} />
              <Text style={[styles.sectionTitle, { color: PrimaryColors.dark }]}>Help & Support</Text>
            </View>
            <View style={styles.sectionContent}>
              <TouchableOpacity style={styles.helpItem}>
                <Info size={18} color={NeutralColors.textSecondary} />
                <Text style={styles.helpText}>About</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.helpItem}>
                <HelpCircle size={18} color={NeutralColors.textSecondary} />
                <Text style={styles.helpText}>Help Center</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    // Header is now separated, so content needs normal top padding
    paddingTop: 20,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF', // White text
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E6F2FF', // Light blue/white text
  },
  section: {
    marginBottom: 24,
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.divider,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionContent: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: StatusColors.error,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 10,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutHint: {
    fontSize: 12,
    color: NeutralColors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: NeutralColors.divider,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  modalConfirmButton: {
    backgroundColor: StatusColors.error,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  helpText: {
    fontSize: 15,
    color: NeutralColors.textPrimary,
    fontWeight: '500',
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
    color: '#7B61FF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchHint: {
    fontSize: 12,
    color: NeutralColors.textTertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});


