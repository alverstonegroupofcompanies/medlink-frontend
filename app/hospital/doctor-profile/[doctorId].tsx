import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  User,
  CheckCircle,
  Calendar,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import { ScreenSafeArea, useSafeBottomPadding } from '@/components/screen-safe-area';
import { getFullImageUrl } from '@/utils/url-helper';

export default function DoctorProfileScreen() {
  const { doctorId } = useLocalSearchParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const safeBottomPadding = useSafeBottomPadding();

  useFocusEffect(
    React.useCallback(() => {
      loadDoctorProfile();
    }, [doctorId])
  );

  const loadDoctorProfile = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/hospital/doctors/${doctorId}/profile`);
      setDoctor(response.data.doctor);
    } catch (error: any) {
      console.error('Error loading doctor profile:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load doctor profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} size={20} color="#FFB800" fill="#FFB800" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} size={20} color="#FFB800" fill="#FFB800" style={{ opacity: 0.5 }} />
        );
      } else {
        stars.push(
          <Star key={i} size={20} color={NeutralColors.border} />
        );
      }
    }
    return stars;
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading doctor profile...</Text>
        </View>
      </View>
      </ScreenSafeArea>
    );
  }

  if (!doctor) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Doctor profile not found</Text>
        </View>
      </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Doctor Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: safeBottomPadding + 16 }]}>
        {/* Profile Photo and Basic Info */}
        <View style={styles.profileSection}>
          <Image
            source={{
              uri: getFullImageUrl(doctor.profile_photo),
            }}
            style={styles.profileImage}
          />
          <Text style={styles.doctorName}>{doctor.name || 'Doctor'}</Text>
          <Text style={styles.specialization}>{doctor.specialization || 'Not specified'}</Text>
          
          {/* Rating - White text on blue background */}
          <View style={styles.ratingContainer}>
            <View style={styles.ratingBadge}>
              <View style={styles.starsRow}>
                {renderStars(doctor.average_rating || 0)}
              </View>
              <Text style={styles.ratingText}>
                {doctor.average_rating?.toFixed(1) || '0.0'} ({doctor.total_ratings || 0} ratings)
              </Text>
            </View>
          </View>
          
          {/* Quality Information - White text on blue background */}
          <View style={styles.qualityInfoContainer}>
            <View style={styles.qualityBadge}>
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.qualityText}>Verified Doctor</Text>
            </View>
            {doctor.completed_jobs_count > 0 && (
              <View style={styles.qualityBadge}>
                <CheckCircle size={18} color="#fff" />
                <Text style={styles.qualityText}>{doctor.completed_jobs_count} Jobs Completed</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Card */}
        <View style={styles.card}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <CheckCircle size={24} color={StatusColors.success} />
              <Text style={styles.statValue}>{doctor.completed_jobs_count || 0}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Information</Text>
          
          {doctor.phone_number && (
            <View style={styles.infoRow}>
              <Phone size={20} color={PrimaryColors.main} />
              <Text style={styles.infoText}>{doctor.phone_number}</Text>
            </View>
          )}

          {doctor.email && (
            <View style={styles.infoRow}>
              <User size={20} color={PrimaryColors.main} />
              <Text style={styles.infoText}>{doctor.email}</Text>
            </View>
          )}
        </View>

        {/* Location */}
        {doctor.current_location && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Location</Text>
            <View style={styles.infoRow}>
              <MapPin size={20} color={PrimaryColors.main} />
              <Text style={styles.infoText}>{doctor.current_location}</Text>
            </View>
          </View>
        )}

        {/* Additional Info */}
        {doctor.bio && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>About</Text>
            <Text style={styles.bioText}>{doctor.bio}</Text>
          </View>
        )}
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
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 24,
    backgroundColor: PrimaryColors.dark, // Dark blue background like in image
    marginHorizontal: -16,
    marginTop: -16,
    paddingTop: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  doctorName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff', // White text on dark blue background
    marginBottom: 4,
  },
  specialization: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)', // Light white text on dark blue background
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  ratingText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  qualityInfoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  qualityText: {
    fontSize: 12,
    color: '#fff',
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    fontSize: 16,
    color: NeutralColors.textPrimary,
    flex: 1,
  },
  bioText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
  },
});

