import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  StatusBar,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Settings, Bell, Mail, Phone, LogOut, Trash2 } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API from '../api';

const NOTIFICATION_SOUND_KEY = 'hospital_notificationSoundEnabled';
const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function HospitalSettingsScreen() {
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const insets = useSafeAreaInsets();
  const safeBottomPadding = useSafeBottomPadding();

  // Ensure status bar stays blue when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setBarStyle('light-content', true);
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
      }
    }, [])
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const soundEnabled = await AsyncStorage.getItem(NOTIFICATION_SOUND_KEY);
      if (soundEnabled !== null) {
        setNotificationSoundEnabled(soundEnabled === 'true');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationSoundToggle = async (value: boolean) => {
    try {
      setNotificationSoundEnabled(value);
      await AsyncStorage.setItem(NOTIFICATION_SOUND_KEY, value.toString());
    } catch (error) {
      console.error('Error saving notification sound setting:', error);
      Alert.alert('Error', 'Failed to save notification sound setting');
    }
  };

  const handleSupportEmail = () => {
    Linking.openURL('mailto:support@alverconnect.com?subject=Support Request');
  };

  const handleSupportPhone = () => {
    Linking.openURL('tel:+9118001234567');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Try to call backend logout API
              try {
                const token = await AsyncStorage.getItem(HOSPITAL_TOKEN_KEY);
                if (token) {
                  await API.post('/hospital/logout');
                }
              } catch (error) {
                console.warn('Backend logout failed, continuing with local logout');
              }

              // Clear ALL authentication data (both hospital and doctor) to allow switching
              await AsyncStorage.multiRemove([
                HOSPITAL_TOKEN_KEY, 
                HOSPITAL_INFO_KEY,
                'hospitalToken',
                'hospitalInfo',
                'doctorToken',
                'doctorInfo',
              ]);
              
              // Double-check and clear individually
              await AsyncStorage.removeItem(HOSPITAL_TOKEN_KEY);
              await AsyncStorage.removeItem(HOSPITAL_INFO_KEY);
              await AsyncStorage.removeItem('hospitalToken');
              await AsyncStorage.removeItem('hospitalInfo');
              await AsyncStorage.removeItem('doctorToken');
              await AsyncStorage.removeItem('doctorInfo');
              
              router.replace('/login'); // Go to doctor login, user can switch from there
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await API.delete('/hospital/account');
              if (response.data.success) {
                Alert.alert('Success', 'Your account has been deleted successfully.', [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await AsyncStorage.multiRemove([HOSPITAL_TOKEN_KEY, HOSPITAL_INFO_KEY]);
                      router.replace('/login');
                    },
                  },
                ]);
              }
            } catch (error: any) {
              console.error('Delete account error:', error);
              const message = error?.response?.data?.message || 'Failed to delete account. Please try again.';
              Alert.alert('Error', message);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenSafeArea backgroundColor="#2563EB" statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} animated={true} />
      
      {/* Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Settings</Text>
            <Text style={styles.headerSubtitle}>Manage your preferences</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: safeBottomPadding + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Bell size={20} color={PrimaryColors.main} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Notification Sound</Text>
                <Text style={styles.settingDescription}>Play sound for notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationSoundEnabled}
              onValueChange={handleNotificationSoundToggle}
              trackColor={{ false: '#D1D5DB', true: PrimaryColors.main }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleSupportEmail}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
                <Mail size={20} color="#10B981" />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Email Support</Text>
                <Text style={styles.settingDescription}>support@alverconnect.com</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleSupportPhone}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
                <Phone size={20} color={PrimaryColors.main} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Phone Support</Text>
                <Text style={styles.settingDescription}>+91 1800-123-4567</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
                <LogOut size={20} color="#EF4444" />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Logout</Text>
                <Text style={styles.settingDescription}>Sign out of your account</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem} onPress={handleDeleteAccount}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: '#FEF2F2' }]}>
                <Trash2 size={20} color="#EF4444" />
              </View>
              <View style={styles.settingText}>
                <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Delete Account</Text>
                <Text style={styles.settingDescription}>Permanently delete your account</Text>
              </View>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    backgroundColor: '#2563EB',
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontWeight: '400',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
});
