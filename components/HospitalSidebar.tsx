import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  X,
  Home,
  Calendar,
  MapPin,
  Bell,
  FileText,
  User,
  Settings,
  LogOut,
  Building2,
  DollarSign,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HospitalSidebarProps {
  visible: boolean;
  onClose: () => void;
}

export default function HospitalSidebar({ visible, onClose }: HospitalSidebarProps) {
  const router = useRouter();

  // Only show additional menus (not the 4 main tabs)
  const menuItems = [
    {
      id: 'applications',
      title: 'Applications',
      icon: FileText,
      route: '/hospital/applications',
      color: PrimaryColors.main,
    },
    {
      id: 'profile',
      title: 'Hospital Profile',
      icon: Building2,
      route: '/hospital/profile',
      color: PrimaryColors.main,
    },
    {
      id: 'payments',
      title: 'Payments',
      icon: DollarSign,
      route: '/hospital/payments',
      color: PrimaryColors.main,
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: Settings,
      route: '/hospital/settings',
      color: PrimaryColors.main,
    },
  ];

  const handleMenuPress = async (route: string) => {
    onClose();
    // Small delay to allow modal to close smoothly
    setTimeout(() => {
      router.push(route as any);
    }, 300);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('hospitalToken');
      await AsyncStorage.removeItem('hospitalData');
      onClose();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sidebar}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Menu</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={NeutralColors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.menuContainer} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => handleMenuPress(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: `${item.color}15` }]}>
                    <Icon size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </TouchableOpacity>
              );
            })}

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#ef444415' }]}>
                <LogOut size={22} color="#ef4444" />
              </View>
              <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sidebar: {
    width: '75%',
    maxWidth: 320,
    backgroundColor: NeutralColors.cardBackground,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: NeutralColors.background,
  },
  menuContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  divider: {
    height: 1,
    backgroundColor: NeutralColors.border,
    marginVertical: 8,
    marginHorizontal: 20,
  },
});

