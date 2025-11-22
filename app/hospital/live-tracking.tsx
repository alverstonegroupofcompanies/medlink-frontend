import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
// import { router } from 'expo-router'; // Not used when disabled
import { MapPin, User, CheckCircle, Clock, Navigation } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
// import API from '../api'; // Disabled - feature off
import { LiveTrackingMap } from '@/components/LiveTrackingMap';

// const { width, height } = Dimensions.get('window'); // Not used when disabled

export default function LiveTrackingScreen() {
  // Feature disabled - Live location tracking temporarily unavailable

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Live Doctor Tracking</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Feature Disabled Message */}
      <View style={styles.disabledContainer}>
        <MapPin size={64} color={NeutralColors.textTertiary} />
        <Text style={styles.disabledTitle}>Feature Temporarily Disabled</Text>
        <Text style={styles.disabledText}>
          Live location tracking is currently unavailable. This feature will be enabled in a future update.
        </Text>
      </View>

      {/* Original content hidden when disabled */}
      {false && (
      <>

      {/* Map */}
      {hospital && hospital.latitude && hospital.longitude && 
       !isNaN(parseFloat(hospital.latitude)) && !isNaN(parseFloat(hospital.longitude)) && (
        <View style={styles.mapContainer}>
          <LiveTrackingMap
            hospital={{
              latitude: typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude),
              longitude: typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude),
              name: hospital.name || 'Hospital',
            }}
            doctors={doctors.filter(d => 
              d.latitude && d.longitude && 
              !isNaN(parseFloat(d.latitude)) && !isNaN(parseFloat(d.longitude))
            ).map(d => ({
              ...d,
              latitude: typeof d.latitude === 'number' ? d.latitude : parseFloat(d.latitude),
              longitude: typeof d.longitude === 'number' ? d.longitude : parseFloat(d.longitude),
            }))}
            height={height * 0.5}
          />
        </View>
      )}

      {/* Doctors List */}
      <ScrollView
        style={styles.doctorsList}
        contentContainerStyle={styles.doctorsListContent}
        showsVerticalScrollIndicator={false}
      >
        {doctors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <User size={64} color={NeutralColors.textSecondary} />
            <Text style={styles.emptyTitle}>No Active Doctors</Text>
            <Text style={styles.emptyText}>
              Doctors with active sessions will appear here with their live locations.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Active Doctors ({doctors.length})
            </Text>
            {doctors.map((doctor) => {
              // Ensure coordinates are valid numbers
              const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
              const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
              const hospitalLat = hospital?.latitude ? (typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude)) : null;
              const hospitalLng = hospital?.longitude ? (typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude)) : null;
              
              const distance = hospitalLat && hospitalLng && doctorLat && doctorLng && !isNaN(doctorLat) && !isNaN(doctorLng)
                ? calculateDistance(
                    doctorLat,
                    doctorLng,
                    hospitalLat,
                    hospitalLng
                  )
                : null;

              return (
                <TouchableOpacity
                  key={doctor.doctor_id}
                  style={[
                    styles.doctorCard,
                    selectedDoctor === doctor.doctor_id && styles.doctorCardSelected
                  ]}
                  onPress={() => setSelectedDoctor(
                    selectedDoctor === doctor.doctor_id ? null : doctor.doctor_id
                  )}
                >
                  <View style={styles.doctorHeader}>
                    <View style={styles.doctorIcon}>
                      <User size={24} color={PrimaryColors.main} />
                    </View>
                    <View style={styles.doctorInfo}>
                      <Text style={styles.doctorName}>{doctor.doctor_name}</Text>
                      <Text style={styles.doctorDepartment}>{doctor.department}</Text>
                    </View>
                    <View style={styles.statusIndicator}>
                      {doctor.check_in_verified ? (
                        <CheckCircle size={20} color={StatusColors.success} />
                      ) : (
                        <Clock size={20} color={StatusColors.warning} />
                      )}
                    </View>
                  </View>

                  {selectedDoctor === doctor.doctor_id && (
                    <View style={styles.doctorDetails}>
                      <View style={styles.detailRow}>
                        <MapPin size={16} color={NeutralColors.textSecondary} />
                        <Text style={styles.detailText}>
                          {doctorLat && doctorLng && !isNaN(doctorLat) && !isNaN(doctorLng)
                            ? `${doctorLat.toFixed(6)}, ${doctorLng.toFixed(6)}`
                            : 'Location not available'}
                        </Text>
                      </View>
                      {distance !== null && (
                        <View style={styles.detailRow}>
                          <Navigation size={16} color={PrimaryColors.main} />
                          <Text style={styles.detailText}>
                            {distance < 1 
                              ? `${Math.round(distance * 1000)}m from hospital` 
                              : `${distance.toFixed(2)} km from hospital`}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Clock size={16} color={NeutralColors.textSecondary} />
                        <Text style={styles.detailText}>
                          Updated {getTimeAgo(doctor.location_updated_at)}
                        </Text>
                      </View>
                      {doctor.check_in_time && (
                        <View style={styles.detailRow}>
                          <CheckCircle size={16} color={StatusColors.success} />
                          <Text style={styles.detailText}>
                            Checked in: {new Date(doctor.check_in_time).toLocaleTimeString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
      </>
      )}
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
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: PrimaryColors.main,
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  mapContainer: {
    height: 300, // Fixed height since feature is disabled
    backgroundColor: NeutralColors.cardBackground,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.background,
  },
  mapPlaceholderText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 80,
  },
  disabledTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  disabledText: {
    fontSize: 15,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  doctorsList: {
    flex: 1,
  },
  doctorsListContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 16,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  doctorCardSelected: {
    borderColor: PrimaryColors.main,
    backgroundColor: PrimaryColors.lightest,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  doctorDepartment: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  statusIndicator: {
    marginLeft: 12,
  },
  doctorDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    flex: 1,
  },
});

