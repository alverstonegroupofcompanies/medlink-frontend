import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Clock,
  MapPin,
  CheckCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react-native';
import { ModernColors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/modern-theme';
import API from './api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { ModernCard } from '@/components/modern-card';
import { isDoctorLoggedIn, getDoctorInfo } from '@/utils/auth';

const { width } = Dimensions.get('window');

export default function AllOpeningsScreen() {
  const [jobRequirements, setJobRequirements] = useState<any[]>([]);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Check if doctor is logged in
      const isLoggedIn = await isDoctorLoggedIn();
      if (!isLoggedIn) {
        router.replace('/login');
        return;
      }

      // Load doctor info
      const doctorInfo = await getDoctorInfo();
      if (doctorInfo) {
        setDoctor(doctorInfo);
      }

      // Load job requirements and applications in parallel
      const [requirementsResponse, applicationsResponse] = await Promise.all([
        API.get('/job-requirements'),
        API.get('/doctor/applications'),
      ]);

      setJobRequirements(requirementsResponse.data.requirements || []);
      setMyApplications(applicationsResponse.data.applications || []);
    } catch (error: any) {
      console.error('Error loading openings:', error);
      if (error.response?.status === 401) {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleApply = async (requirementId: number) => {
    // Check if doctor account is verified before applying
    if (!doctor) {
      return;
    }

    const verificationStatus = doctor.verification_status;
    
    if (verificationStatus !== 'approved') {
      const { Alert } = require('react-native');
      let title = 'Account Not Verified';
      let message = '';
      
      if (verificationStatus === 'pending') {
        message = 'Your account is pending verification.\n\nPlease wait for admin approval before applying to jobs. You will be notified once your account is verified.';
      } else if (verificationStatus === 'rejected') {
        message = 'Your account verification has been rejected.\n\nPlease contact the admin or update your profile and request verification again.';
      } else {
        message = 'Your account needs to be verified before you can apply to jobs.\n\nPlease complete your profile and wait for admin approval.';
      }
      
      Alert.alert(title, message, [
        { text: 'OK', style: 'default' },
        verificationStatus === 'pending' ? null : {
          text: 'Go to Profile',
          style: 'default',
          onPress: () => router.push('/(tabs)/profile'),
        },
      ].filter(Boolean));
      return;
    }

    try {
      await API.post('/doctor/apply', {
        job_requirement_id: requirementId,
      });
      const { Alert } = require('react-native');
      Alert.alert('Success', 'Application submitted successfully!');
      loadData();
    } catch (error: any) {
      const { Alert } = require('react-native');
      const message = error.response?.data?.message || 'Failed to submit application';
      Alert.alert('Error', message);
    }
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={ModernColors.neutral.background}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>All Job Openings</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={ModernColors.primary.main} />
            <Text style={styles.loadingText}>Loading openings...</Text>
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  const isVerified = doctor?.verification_status === 'approved';
  const isPendingVerification = doctor?.verification_status === 'pending';

  return (
    <ScreenSafeArea backgroundColor={ModernColors.neutral.background}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>All Job Openings</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {jobRequirements.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Building2 size={64} color={ModernColors.neutral.gray300} />
              <Text style={styles.emptyText}>No job openings available</Text>
              <Text style={styles.emptySubtext}>Check back later for new opportunities</Text>
            </View>
          ) : (
            jobRequirements.map((requirement) => {
              const application = myApplications.find(
                (app: any) => app.job_requirement_id === requirement.id
              );
              const hasApplied = !!application;
              const applicationStatus = application?.status || null;

              return (
                <ModernCard key={requirement.id} variant="elevated" style={styles.openingCard}>
                  <View style={styles.openingHeader}>
                    {requirement.hospital?.logo_url ? (
                      <Image
                        source={{ uri: requirement.hospital.logo_url }}
                        style={styles.hospitalLogo}
                      />
                    ) : (
                      <View style={[styles.hospitalLogoPlaceholder, { backgroundColor: ModernColors.primary.light }]}>
                        <Building2 size={20} color={ModernColors.primary.main} />
                      </View>
                    )}
                    <View style={styles.openingHeaderText}>
                      <Text style={styles.hospitalName} numberOfLines={1}>
                        {requirement.hospital?.name || 'Hospital'}
                      </Text>
                      <Text style={styles.departmentName} numberOfLines={1}>
                        {requirement.department}
                      </Text>
                    </View>
                  </View>

                  {requirement.description && (
                    <Text style={styles.description} numberOfLines={2}>
                      {requirement.description}
                    </Text>
                  )}

                  <View style={styles.openingDetails}>
                    <View style={styles.detailRow}>
                      <Clock size={14} color={ModernColors.text.secondary} />
                      <Text style={styles.detailText}>{requirement.required_sessions} sessions</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <MapPin size={14} color={ModernColors.text.secondary} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {requirement.location || 'Location TBD'}
                      </Text>
                    </View>
                  </View>

                  {hasApplied ? (
                    <View style={[styles.applyButton, styles.appliedButton]}>
                      <Text style={styles.appliedButtonText}>
                        {applicationStatus === 'pending' ? 'Waiting for Approval' : 
                         applicationStatus === 'selected' ? 'Approved' :
                         applicationStatus === 'rejected' ? 'Rejected' : 'Applied'}
                      </Text>
                    </View>
                  ) : !isVerified ? (
                    <TouchableOpacity
                      style={[styles.applyButton, { backgroundColor: ModernColors.neutral.gray400 }]}
                      onPress={() => handleApply(requirement.id)}
                      activeOpacity={0.8}
                    >
                      <AlertCircle size={16} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.applyButtonText}>
                        {isPendingVerification ? 'Verify Now to Apply' : 'Account Not Verified'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.applyButton, { backgroundColor: ModernColors.primary.main }]}
                      onPress={() => handleApply(requirement.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.applyButtonText}>Apply Now</Text>
                      <ArrowRight size={16} color="#fff" />
                    </TouchableOpacity>
                  )}
                </ModernCard>
              );
            })
          )}
        </ScrollView>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ModernColors.neutral.background,
  },
  header: {
    backgroundColor: ModernColors.primary.main,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: ModernColors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
  },
  emptyText: {
    ...Typography.h3,
    color: ModernColors.text.primary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body,
    color: ModernColors.text.secondary,
    textAlign: 'center',
  },
  openingCard: {
    marginBottom: Spacing.md,
  },
  openingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  hospitalLogo: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  hospitalLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  openingHeaderText: {
    flex: 1,
  },
  hospitalName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: 2,
  },
  departmentName: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  description: {
    ...Typography.body,
    color: ModernColors.text.primary,
    marginBottom: Spacing.md,
  },
  openingDetails: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
    flex: 1,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  appliedButton: {
    backgroundColor: ModernColors.neutral.gray200,
  },
  applyButtonText: {
    ...Typography.captionBold,
    color: '#fff',
    fontSize: 14,
  },
  appliedButtonText: {
    ...Typography.captionBold,
    color: ModernColors.text.secondary,
    fontSize: 14,
  },
});



