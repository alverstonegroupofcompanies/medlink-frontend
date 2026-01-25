import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, User, X } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { getFullImageUrl } from '@/utils/url-helper';

export default function CompareApplicationsScreen() {
  const { requirementId, applicationIds } = useLocalSearchParams<{ requirementId: string; applicationIds: string }>();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, [applicationIds]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const ids = applicationIds?.split(',').map(id => parseInt(id.trim())).filter(Boolean) || [];
      
      if (ids.length === 0) {
        router.back();
        return;
      }

      const response = await API.get(`/hospital/requirements/${requirementId}/applications`);
      const allApplications = response.data.applications || [];
      
      // Filter to only selected applications
      const selectedApps = allApplications.filter((app: any) => ids.includes(app.id));
      setApplications(selectedApps);
    } catch (error: any) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = () => {
    router.back();
  };

  const handleHire = async (applicationId: number) => {
    try {
      await API.put(`/hospital/applications/${applicationId}/status`, {
        status: 'selected',
      });
      // Reload to update status
      loadApplications();
    } catch (error: any) {
      console.error('Error hiring:', error);
    }
  };

  const handleViewProfile = (doctorId: number) => {
    router.push(`/hospital/doctor-profile/${doctorId}`);
  };

  if (loading || applications.length === 0) {
    return (
      <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Compare Applications</Text>
            <View style={styles.backButton} />
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Compare Applications</Text>
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Profiles Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <User size={20} color={PrimaryColors.main} />
              <Text style={styles.sectionTitle}>PROFILES</Text>
            </View>
            <View style={styles.profilesRow}>
              {applications.map((app, index) => (
                <View key={app.id} style={styles.profileColumn}>
                  <View style={styles.profileImageContainer}>
                    <Image
                      source={{ uri: getFullImageUrl(app.doctor?.profile_photo) }}
                      style={styles.profileImage}
                    />
                    {app.status === 'selected' && (
                      <View style={styles.matchBadge}>
                        <Text style={styles.matchBadgeText}>MATCH</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.profileName}>
                    {app.doctor?.name || 'Doctor'}
                  </Text>
                  <Text style={styles.profileSpecialty}>
                    {app.doctor?.departments?.[0]?.name || 
                     app.doctor?.departments?.[0]?.department?.name ||
                     app.doctor?.specialization || 
                     'Specialist'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Experience Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>EXPERIENCE</Text>
            </View>
            <View style={styles.comparisonGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Years</Text>
                {applications.map((app) => (
                  <Text key={app.id} style={styles.gridValue}>
                    {app.doctor?.experience || 'N/A'} Years
                  </Text>
                ))}
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Current Role</Text>
                {applications.map((app) => (
                  <Text key={app.id} style={styles.gridValue}>
                    {app.doctor?.current_hospital || 'N/A'}
                  </Text>
                ))}
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Previous</Text>
                {applications.map((app) => (
                  <Text key={app.id} style={styles.gridValue}>
                    {app.doctor?.previous_hospital || 'N/A'}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Education Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>EDUCATION</Text>
            </View>
            <View style={styles.comparisonGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Medical School</Text>
                {applications.map((app) => (
                  <View key={app.id} style={styles.gridValue}>
                    <Text style={styles.gridValueBold}>
                      {app.doctor?.qualifications?.split(',')[0] || app.doctor?.qualifications || 'Medical School'}
                    </Text>
                    <Text style={styles.gridValueSmall}>
                      Class of {new Date().getFullYear() - (parseInt(app.doctor?.experience) || 0) - 4}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Fellowship</Text>
                {applications.map((app) => (
                  <Text key={app.id} style={styles.gridValue}>
                    {app.doctor?.qualifications?.split(',')[1]?.trim() || 'N/A'}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Certifications Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
            </View>
            <View style={styles.comparisonGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Board Certs</Text>
                {applications.map((app) => (
                  <View key={app.id} style={styles.certificationsContainer}>
                    {['ABIM', 'ACLS', 'PALS'].slice(0, 3).map((cert, idx) => (
                      <View key={idx} style={styles.certBadge}>
                        <Text style={styles.certBadgeText}>{cert}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Availability Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>AVAILABILITY</Text>
            </View>
            <View style={styles.comparisonGrid}>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Status</Text>
                {applications.map((app) => (
                  <View key={app.id} style={styles.statusContainer}>
                    <View style={[styles.statusDot, { backgroundColor: app.available_date ? StatusColors.success : StatusColors.warning }]} />
                    <Text style={styles.gridValue}>
                      {app.available_date ? 'Immediate' : '30 Days'}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={styles.gridRow}>
                <Text style={styles.gridLabel}>Relocation</Text>
                {applications.map((app) => (
                  <Text key={app.id} style={styles.gridValue}>
                    {app.doctor?.preferred_location ? 'Yes' : 'Local Only'}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsSection}>
            {applications.map((app, index) => (
              <View key={app.id} style={styles.actionColumn}>
                <TouchableOpacity
                  style={[styles.hireButton, app.status === 'selected' && styles.hireButtonActive]}
                  onPress={() => handleHire(app.id)}
                >
                  <User size={18} color="#fff" />
                  <Text style={styles.hireButtonText}>Hire</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => handleViewProfile(app.doctor?.id)}
                >
                  <Text style={styles.viewProfileButtonText}>View Profile</Text>
                </TouchableOpacity>
              </View>
            ))}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: PrimaryColors.dark,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PrimaryColors.dark,
    letterSpacing: 0.5,
  },
  profilesRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-around',
  },
  profileColumn: {
    flex: 1,
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: NeutralColors.border,
  },
  matchBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: PrimaryColors.main,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  matchBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  profileSpecialty: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
  },
  comparisonGrid: {
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
  },
  gridLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    width: 100,
    flexShrink: 0,
  },
  gridValue: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.textPrimary,
  },
  gridValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  gridValueSmall: {
    fontSize: 11,
    color: NeutralColors.textTertiary,
    marginTop: 2,
  },
  certificationsContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  certBadge: {
    backgroundColor: PrimaryColors.lightest,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PrimaryColors.light,
  },
  certBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  statusContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionColumn: {
    flex: 1,
    gap: 8,
  },
  hireButton: {
    backgroundColor: PrimaryColors.light,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
  },
  hireButtonActive: {
    backgroundColor: PrimaryColors.main,
  },
  hireButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  viewProfileButton: {
    borderWidth: 1,
    borderColor: PrimaryColors.light,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewProfileButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
});
