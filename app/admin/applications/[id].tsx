import React, { useState, useEffect, useCallback } from 'react';
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
  Platform,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, BASE_BACKEND_URL } from '../../../config/api';
import {
  ArrowLeft,
  User,
  Building2,
  FileText,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  DollarSign,
  PlayCircle,
  CheckCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';

export default function ApplicationDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadApplication();
    }, [id])
  );

  const loadApplication = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data.status) {
        // Find the specific application from all applications
        const allApplications = response.data.applications.all || [];
        const found = allApplications.find((app: any) => app.id === parseInt(id as string));
        
        if (found) {
          setApplication(found);
        } else {
          Alert.alert('Error', 'Application not found');
          router.back();
        }
      }
    } catch (error: any) {
      console.error('Error loading application:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load application details');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircle size={20} color="#10b981" />;
      case 'rejected':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'selected':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'selected':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Applied';
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

  if (!application) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Application not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Status Badge */}
        <View style={[styles.statusCard, { backgroundColor: `${getStatusColor(application.status)}15` }]}>
          <View style={styles.statusContent}>
            {getStatusIcon(application.status)}
            <Text style={[styles.statusText, { color: getStatusColor(application.status) }]}>
              {getStatusText(application.status)}
            </Text>
          </View>
          <Text style={styles.applicationId}>Application #{application.id}</Text>
        </View>

        {/* Doctor Information - Who Applied */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={24} color="#2563eb" />
            <Text style={styles.sectionTitle}>Doctor Information (Who Applied)</Text>
          </View>
          {application.doctor?.profile_photo_url && (
            <Image
              source={{ uri: application.doctor.profile_photo_url }}
              style={styles.profileImage}
            />
          )}
          <DetailRow
            icon={<User size={18} color="#64748b" />}
            label="Name"
            value={application.doctor?.name || 'N/A'}
          />
          <DetailRow
            icon={<Mail size={18} color="#64748b" />}
            label="Email"
            value={application.doctor?.email || 'N/A'}
          />
          {application.doctor?.phone_number && (
            <DetailRow
              icon={<Phone size={18} color="#64748b" />}
              label="Phone"
              value={application.doctor.phone_number}
            />
          )}
          {application.doctor?.specialization && (
            <DetailRow
              icon={<FileText size={18} color="#64748b" />}
              label="Specialization"
              value={application.doctor.specialization}
            />
          )}
        </View>

        {/* Hospital Information - Who Posted */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Building2 size={24} color="#10b981" />
            <Text style={styles.sectionTitle}>Hospital Information (Who Posted)</Text>
          </View>
          <DetailRow
            icon={<Building2 size={18} color="#64748b" />}
            label="Hospital Name"
            value={application.job_requirement?.hospital?.name || 'N/A'}
          />
          {application.job_requirement?.hospital?.email && (
            <DetailRow
              icon={<Mail size={18} color="#64748b" />}
              label="Email"
              value={application.job_requirement.hospital.email}
            />
          )}
          {application.job_requirement?.hospital?.phone_number && (
            <DetailRow
              icon={<Phone size={18} color="#64748b" />}
              label="Phone"
              value={application.job_requirement.hospital.phone_number}
            />
          )}
          {application.job_requirement?.hospital?.address && (
            <DetailRow
              icon={<MapPin size={18} color="#64748b" />}
              label="Address"
              value={application.job_requirement.hospital.address}
            />
          )}
        </View>

        {/* Job Requirement Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={24} color="#2563eb" />
            <Text style={styles.sectionTitle}>Job Requirement Details</Text>
          </View>
          <DetailRow
            icon={<FileText size={18} color="#64748b" />}
            label="Department"
            value={application.job_requirement?.department || 'N/A'}
          />
          <DetailRow
            icon={<FileText size={18} color="#64748b" />}
            label="Work Type"
            value={application.job_requirement?.work_type || 'N/A'}
          />
          {application.job_requirement?.work_required_date && (
            <DetailRow
              icon={<Calendar size={18} color="#64748b" />}
              label="Work Required Date"
              value={new Date(application.job_requirement.work_required_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
          )}
          {application.job_requirement?.start_time && (
            <DetailRow
              icon={<Clock size={18} color="#64748b" />}
              label="Start Time"
              value={application.job_requirement.start_time}
            />
          )}
          {application.job_requirement?.end_time && (
            <DetailRow
              icon={<Clock size={18} color="#64748b" />}
              label="End Time"
              value={application.job_requirement.end_time}
            />
          )}
          {(application.job_requirement?.salary_range_min || application.job_requirement?.salary_range_max) && (
            <DetailRow
              icon={<DollarSign size={18} color="#64748b" />}
              label="Salary Range"
              value={`₹${application.job_requirement.salary_range_min?.toLocaleString() || '0'} - ₹${application.job_requirement.salary_range_max?.toLocaleString() || '0'}`}
            />
          )}
        </View>

        {/* Application Details */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <FileText size={24} color="#8b5cf6" />
            <Text style={styles.sectionTitle}>Application Details</Text>
          </View>
          {application.cover_letter && (
            <View style={styles.textDetail}>
              <Text style={styles.detailLabel}>Cover Letter:</Text>
              <Text style={styles.textValue}>{application.cover_letter}</Text>
            </View>
          )}
          {application.proposed_rate && (
            <DetailRow
              icon={<DollarSign size={18} color="#64748b" />}
              label="Proposed Rate"
              value={`₹${application.proposed_rate.toLocaleString()}`}
            />
          )}
          {application.available_date && (
            <DetailRow
              icon={<Calendar size={18} color="#64748b" />}
              label="Available Date"
              value={new Date(application.available_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            />
          )}
        </View>

        {/* Job Session - Who Does The Job */}
        {application.job_session ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <PlayCircle size={24} color="#8b5cf6" />
              <Text style={styles.sectionTitle}>Job Session (Who Does The Job)</Text>
            </View>
            <DetailRow
              icon={<PlayCircle size={18} color="#64748b" />}
              label="Session Status"
              value={application.job_session.status ? application.job_session.status.charAt(0).toUpperCase() + application.job_session.status.slice(1).replace('_', ' ') : 'N/A'}
            />
            {application.job_session.session_date && (
              <DetailRow
                icon={<Calendar size={18} color="#64748b" />}
                label="Session Date"
                value={new Date(application.job_session.session_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              />
            )}
            {application.job_session.check_in_time && (
              <DetailRow
                icon={<CheckCircle2 size={18} color="#10b981" />}
                label="Check-In Time"
                value={new Date(application.job_session.check_in_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
            )}
            {application.job_session.check_in_verified && (
              <DetailRow
                icon={<CheckCircle size={18} color="#10b981" />}
                label="Check-In Status"
                value="✓ Verified"
              />
            )}
            {application.job_session.check_out_time && (
              <DetailRow
                icon={<Clock size={18} color="#64748b" />}
                label="Check-Out Time"
                value={new Date(application.job_session.check_out_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
            )}
            {application.job_session.end_time && (
              <DetailRow
                icon={<CheckCircle size={18} color="#10b981" />}
                label="Job Close Time"
                value={new Date(application.job_session.end_time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              />
            )}
            {application.job_session.payment_amount && (
              <DetailRow
                icon={<DollarSign size={18} color="#10b981" />}
                label="Payment Amount"
                value={`₹${application.job_session.payment_amount.toLocaleString()}`}
              />
            )}
          </View>
        ) : application.status === 'selected' ? (
          <View style={styles.section}>
            <Text style={styles.noSessionText}>
              ⚠️ Application approved but no job session created yet
            </Text>
          </View>
        ) : null}

        {/* Timeline */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={24} color="#64748b" />
            <Text style={styles.sectionTitle}>Application Timeline</Text>
          </View>
          <DetailRow
            icon={<Clock size={18} color="#64748b" />}
            label="Applied On"
            value={new Date(application.created_at).toLocaleString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          />
          {application.updated_at && application.updated_at !== application.created_at && (
            <DetailRow
              icon={<CheckCircle size={18} color="#64748b" />}
              label="Last Updated"
              value={new Date(application.updated_at).toLocaleString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            />
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
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
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
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
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
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
  },
  applicationId: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    alignSelf: 'center',
    borderWidth: 3,
    borderColor: '#e2e8f0',
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
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
  },
  textDetail: {
    marginBottom: 16,
  },
  textValue: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
  },
  noSessionText: {
    fontSize: 14,
    color: '#f59e0b',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

