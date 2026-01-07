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
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { Building2, User, FileText, Calendar, LogOut, DollarSign } from 'lucide-react-native';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStats();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      await axios.post(`${API_BASE_URL}/admin/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.removeItem('admin_token');
      await AsyncStorage.removeItem('admin_data');
      router.replace('/admin/login');
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <LogOut size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadStats} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <StatCard
            icon={<User size={24} color="#2563eb" />}
            label="Doctors"
            value={stats?.total_doctors || 0}
            onPress={() => router.push('/admin/doctors')}
          />
          <StatCard
            icon={<Building2 size={24} color="#10b981" />}
            label="Hospitals"
            value={stats?.total_hospitals || 0}
            onPress={() => router.push('/admin/hospitals')}
          />
          <StatCard
            icon={<FileText size={24} color="#f59e0b" />}
            label="Applications"
            value={stats?.total_applications || 0}
            onPress={() => {
              console.log('Navigating to applications...');
              router.push('/admin/applications');
            }}
          />
          <StatCard
            icon={<Calendar size={24} color="#8b5cf6" />}
            label="Job Sessions"
            value={stats?.total_job_sessions || 0}
            onPress={() => {
              console.log('Navigating to job-sessions...');
              router.push('/admin/job-sessions');
            }}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/doctors')}
          >
            <Text style={styles.actionButtonText}>View All Doctors</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/hospitals')}
          >
            <Text style={styles.actionButtonText}>View All Hospitals</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/applications')}
          >
            <Text style={styles.actionButtonText}>View All Applications</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/job-sessions')}
          >
            <Text style={styles.actionButtonText}>View Job Sessions</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/admin/payments')}
          >
            <Text style={styles.actionButtonText}>View Payment History</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.statCard}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {onPress && (
        <View style={styles.statArrow}>
          <Text style={styles.statArrowText}>→</Text>
        </View>
      )}
    </TouchableOpacity>
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
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
    letterSpacing: -0.5,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  content: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  statIcon: {
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  statArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statArrowText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
    letterSpacing: -0.3,
  },
  actionButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
    letterSpacing: 0.1,
  },
});

