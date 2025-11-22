import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Building2, 
  Navigation, 
  ArrowLeft, 
  ExternalLink, 
  Phone, 
  Mail,
  DollarSign,
  Calendar,
  User
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import API from '../../api';
import * as Location from 'expo-location';

// Import MapView - Metro will automatically resolve .web or .native based on platform
import { MapViewComponent } from '@/components/MapView';
import { CheckInMapView } from '@/components/CheckInMapView';

const { width } = Dimensions.get('window');

export default function JobDetailScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadApplication();
      getCurrentLocation();
    }, [applicationId])
  );

  useEffect(() => {
    if (currentLocation && application?.job_requirement) {
      calculateDistance();
    }
  }, [currentLocation, application]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await API.get('/doctor/applications');
      const applications = response.data.applications || [];
      const app = applications.find((a: any) => a.id.toString() === applicationId);
      setApplication(app);
    } catch (error: any) {
      console.error('Error loading application:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const loc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(loc);

      // Send location to backend
      try {
        await API.post('/doctor/update-location', {
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      } catch (e) {
        console.log('Failed to update location on backend');
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = () => {
    if (!currentLocation || !application?.job_requirement) return;

    // Use job requirement coordinates if hospital coordinates aren't available
    const hospital = application.job_requirement.hospital;
    const latRaw = hospital?.latitude || application.job_requirement?.latitude;
    const lngRaw = hospital?.longitude || application.job_requirement?.longitude;
    
    // Ensure coordinates are numbers
    const lat = latRaw ? (typeof latRaw === 'string' ? parseFloat(latRaw) : latRaw) : null;
    const lng = lngRaw ? (typeof lngRaw === 'string' ? parseFloat(lngRaw) : lngRaw) : null;
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      setDistance(null);
      return;
    }

    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat - currentLocation.latitude);
    const dLon = deg2rad(lng - currentLocation.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(currentLocation.latitude)) *
        Math.cos(deg2rad(lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    setDistance(distance);
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services to check in.');
      return;
    }

    if (!application) {
      Alert.alert('Error', 'Application not found');
      return;
    }

    // If job_session is not loaded, try to find it by reloading the application
    let sessionId = application.job_session?.id;
    let currentSession = application.job_session;
    
    if (!sessionId) {
      // Try to find session by reloading the application data
      try {
        const response = await API.get('/doctor/applications');
        const applications = response.data.applications || [];
        const updatedApp = applications.find((a: any) => a.id.toString() === applicationId);
        if (updatedApp?.job_session?.id) {
          sessionId = updatedApp.job_session.id;
          currentSession = updatedApp.job_session;
          setApplication(updatedApp); // Update application state
        } else {
          Alert.alert(
            'Session Not Found', 
            'Job session not found. Please ensure the hospital has approved your application and created a session. If the issue persists, please contact support.'
          );
          return;
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to load session information. Please try again.');
        return;
      }
    }

    // Check if already checked in (use currentSession which might be from updated app)
    if (currentSession?.check_in_time) {
      Alert.alert('Already Checked In', 'You have already checked in for this session.');
      return;
    }

    try {
      setCheckingIn(true);

      console.log('Attempting check-in with sessionId:', sessionId);
      const response = await API.post('/doctor/check-in', {
        job_session_id: sessionId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      
      console.log('Check-in response:', response.data);

      if (response.data.is_within_range && response.data.check_in_verified) {
        // Navigate to job session page after successful check-in
        // Use the sessionId from the check-in request, or from response, or from application
        let finalSessionId = response.data.session_id || sessionId || application.job_session?.id;
        console.log('Check-in successful, navigating to session:', finalSessionId);
        console.log('Response data:', response.data);
        
        // If no sessionId in response, reload application to get updated session
        if (!finalSessionId) {
          await loadApplication();
          finalSessionId = application.job_session?.id;
        }
        
        if (finalSessionId) {
          // Navigate immediately to job session page
          console.log('Navigating to job session:', finalSessionId);
          router.replace(`/(tabs)/job-session/${finalSessionId}`);
        } else {
          // Fallback: show alert and reload
          Alert.alert(
            'Check-In Confirmed! ✓',
            `Check-in successful!\n\nDistance: ${response.data.distance_meters}m from hospital\nStatus: Verified and confirmed\n\nPlease use the "View Work Session" button to access your session.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  loadApplication();
                },
              },
            ]
          );
        }
      } else {
        Alert.alert(
          'Check-In Failed',
          response.data.message || `You must be within 100 meters of the hospital location.\n\nCurrent distance: ${response.data.distance_meters || 'Unknown'}m`,
          [
            {
              text: 'Get Directions',
              onPress: () => {
                openDirections();
              },
            },
            {
              text: 'OK',
              style: 'cancel',
              onPress: () => {
                loadApplication();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      const errorData = error.response?.data;
      const message = errorData?.message || 'Failed to check in. You must be within 100 meters of the hospital location.';
      const distanceMeters = errorData?.distance_meters;
      
      Alert.alert(
        'Check-In Failed',
        message + (distanceMeters ? `\n\nCurrent distance: ${distanceMeters}m` : ''),
        [
          {
            text: 'Get Directions',
            onPress: () => {
              openDirections();
            },
          },
          {
            text: 'OK',
            style: 'cancel',
            onPress: () => {
              loadApplication();
            },
          },
        ]
      );
    } finally {
      setCheckingIn(false);
    }
  };

  const openDirections = () => {
    if (!application?.job_requirement) return;
    
    // Use job requirement coordinates if hospital coordinates aren't available
    if (hasHospitalLocation && hospitalLat && hospitalLng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`;
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Could not open directions');
      });
    } else if (hospital?.address || application.job_requirement?.address) {
      // Use address if coordinates not available
      const address = encodeURIComponent(hospital?.address || application.job_requirement?.address);
      const url = `https://www.google.com/maps/search/?api=1&query=${address}`;
      Linking.openURL(url).catch(err => {
        Alert.alert('Error', 'Could not open directions');
      });
    } else {
      Alert.alert('Location Not Available', 'Hospital location is not set. Please contact the hospital for directions.');
    }
  };

  const callHospital = () => {
    const phoneNumber = application?.job_requirement?.hospital?.phone_number;
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`).catch(err => {
        Alert.alert('Error', 'Could not make phone call');
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </View>
    );
  }

  if (!application) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={PrimaryColors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Job not found</Text>
        </View>
      </View>
    );
  }

  const hospital = application.job_requirement?.hospital;
  const session = application.job_session;
  // Use job requirement coordinates if hospital coordinates aren't available
  // Ensure coordinates are numbers, not strings
  const hospitalLatRaw = hospital?.latitude || application.job_requirement?.latitude;
  const hospitalLngRaw = hospital?.longitude || application.job_requirement?.longitude;
  const hospitalLat = hospitalLatRaw ? (typeof hospitalLatRaw === 'string' ? parseFloat(hospitalLatRaw) : hospitalLatRaw) : null;
  const hospitalLng = hospitalLngRaw ? (typeof hospitalLngRaw === 'string' ? parseFloat(hospitalLngRaw) : hospitalLngRaw) : null;
  const hasHospitalLocation = !!(hospitalLat && hospitalLng && !isNaN(hospitalLat) && !isNaN(hospitalLng));
  
  // Debug logging
  console.log('🔍 Check-in Debug:', {
    applicationId: application?.id,
    status: application?.status,
    hasSession: !!session,
    sessionId: session?.id,
    approved_at: session?.approved_at,
    check_in_time: session?.check_in_time,
    hospital: hospital ? {
      name: hospital.name,
      address: hospital.address || application.job_requirement?.address,
      latitude: hospitalLat,
      longitude: hospitalLng,
      hasLocation: hasHospitalLocation,
      source: hospital.latitude ? 'hospital_profile' : application.job_requirement?.latitude ? 'job_requirement' : 'none',
    } : null,
    needsCheckIn: application?.status === 'selected' && !session?.check_in_time,
  });
  
  // Check-in is needed if: application is approved (selected) AND not checked in yet
  // Show check-in button if status is 'selected' regardless of session existence
  // (Session should exist when hospital accepts, but show button anyway for visibility)
  const needsCheckIn = application?.status === 'selected' && !session?.check_in_time;
  
  // Additional debug: Log if button should be visible
  console.log('✅ Check-in Button Visibility:', {
    willShow: needsCheckIn,
    reason: needsCheckIn 
      ? 'Application approved and not checked in' 
      : application?.status !== 'selected' 
        ? 'Application not approved' 
        : session?.check_in_time 
          ? 'Already checked in' 
          : 'Unknown reason',
  });
  const isCheckedIn = session?.check_in_time;
  const workDate = application.job_requirement?.work_required_date || session?.session_date;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={PrimaryColors.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hospital Card */}
        <View style={styles.hospitalCard}>
          <View style={styles.hospitalHeader}>
            {hospital?.logo_url ? (
              <Image
                source={{ uri: hospital.logo_url }}
                style={styles.hospitalLogo}
              />
            ) : (
              <View style={styles.hospitalLogoPlaceholder}>
                <Building2 size={32} color={PrimaryColors.main} />
              </View>
            )}
            <View style={styles.hospitalInfo}>
              <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
              <Text style={styles.department}>{application.job_requirement?.department || 'Department'}</Text>
            </View>
          </View>

          {/* Hospital Contact */}
          {hospital?.phone_number && (
            <TouchableOpacity style={styles.contactButton} onPress={callHospital}>
              <Phone size={18} color={PrimaryColors.main} />
              <Text style={styles.contactText}>{hospital.phone_number}</Text>
            </TouchableOpacity>
          )}

          {/* Work Date */}
          {workDate && (
            <View style={styles.infoRow}>
              <Calendar size={18} color={NeutralColors.textSecondary} />
              <Text style={styles.infoText}>
                {new Date(workDate).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
          )}

          {/* Payment Information */}
          {(application.job_requirement?.salary_range_min || session?.payment_amount) && (
            <View style={styles.paymentCard}>
              <View style={styles.paymentHeader}>
                <DollarSign size={20} color={StatusColors.success} />
                <Text style={styles.paymentTitle}>Payment</Text>
              </View>
              {session?.payment_amount ? (
                <Text style={styles.paymentAmount}>₹{session.payment_amount.toLocaleString()}</Text>
              ) : (
                <Text style={styles.paymentRange}>
                  ₹{application.job_requirement.salary_range_min?.toLocaleString() || '0'} - 
                  ₹{application.job_requirement.salary_range_max?.toLocaleString() || '0'}
                </Text>
              )}
            </View>
          )}

          {/* Distance */}
          {distance !== null && (
            <View style={styles.distanceRow}>
              <Navigation size={18} color={PrimaryColors.main} />
              <Text style={styles.distanceText}>
                {distance < 1 
                  ? `${Math.round(distance * 1000)}m away` 
                  : `${distance.toFixed(2)} km away`}
              </Text>
            </View>
          )}
        </View>

        {/* Location */}
        {hospital?.latitude && hospital?.longitude && (
          <View style={styles.mapContainer}>
            <Text style={styles.sectionTitle}>Location</Text>
            {hospital.address && (
              <View style={styles.addressRow}>
                <MapPin size={16} color={NeutralColors.textSecondary} />
                <Text style={styles.addressText}>{hospital.address}</Text>
              </View>
            )}
            <MapViewComponent
              initialLocation={{
                latitude: hospital.latitude,
                longitude: hospital.longitude,
              }}
              height={250}
              showCurrentLocationButton={true}
            />
            <TouchableOpacity
              style={styles.directionsButton}
              onPress={openDirections}
            >
              <ExternalLink size={18} color="#fff" />
              <Text style={styles.directionsButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Check-In Status */}
        <View style={styles.statusCard}>
          {isCheckedIn ? (
            <View style={styles.checkedInStatus}>
              <CheckCircle size={32} color={StatusColors.success} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Checked In</Text>
                <Text style={styles.statusSubtitle}>
                  {new Date(session.check_in_time).toLocaleString()}
                </Text>
                {session.check_in_verified ? (
                  <Text style={styles.verifiedText}>✓ Location verified</Text>
                ) : (
                  <Text style={styles.unverifiedText}>⚠ Location not verified</Text>
                )}
              </View>
              {/* Button to go to job session page */}
              {session?.id && (
                <TouchableOpacity
                  style={styles.goToSessionButton}
                  onPress={() => {
                    router.push(`/(tabs)/job-session/${session.id}`);
                  }}
                >
                  <Clock size={18} color="#fff" />
                  <Text style={styles.goToSessionButtonText}>View Work Session</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : needsCheckIn ? (
            <View style={styles.pendingStatus}>
              <Clock size={32} color={StatusColors.warning} />
              <View style={styles.statusInfo}>
                <Text style={styles.statusTitle}>Check-In Required</Text>
                <Text style={styles.statusSubtitle}>Please check in to confirm your attendance</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Check-In Map and Button */}
        {needsCheckIn && (
          <View style={styles.checkInSection}>
            <Text style={styles.checkInTitle}>Check-In Location</Text>
            <Text style={styles.checkInHint}>
              You must be within 100 meters of the hospital location to check in
            </Text>
            
            {/* Hospital Address */}
            {(hospital?.address || application.job_requirement?.address) && (
              <View style={styles.addressRow}>
                <MapPin size={16} color={NeutralColors.textSecondary} />
                <Text style={styles.addressText}>
                  {hospital?.address || application.job_requirement?.address}
                </Text>
              </View>
            )}

            {/* Google Maps Directions Button - Always show if address exists */}
            {(hasHospitalLocation || hospital?.address || application.job_requirement?.address) && (
              <TouchableOpacity
                style={styles.directionsButton}
                onPress={openDirections}
              >
                <ExternalLink size={18} color="#fff" />
                <Text style={styles.directionsButtonText}>
                  {hasHospitalLocation ? 'Open in Google Maps' : 'Search in Google Maps'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Check-In Map showing Hospital and Doctor locations */}
            {hasHospitalLocation ? (
              currentLocation && CheckInMapView ? (
                <View style={styles.checkInMapContainer}>
                  <CheckInMapView
                    hospitalLocation={{
                      latitude: hospitalLat as number,
                      longitude: hospitalLng as number,
                      name: hospital?.name || 'Hospital',
                    }}
                    doctorLocation={{
                      latitude: typeof currentLocation.latitude === 'string' 
                        ? parseFloat(currentLocation.latitude) 
                        : currentLocation.latitude,
                      longitude: typeof currentLocation.longitude === 'string' 
                        ? parseFloat(currentLocation.longitude) 
                        : currentLocation.longitude,
                    }}
                    height={300}
                  />
                  {distance !== null && (
                    <View style={styles.distanceInfo}>
                      <Navigation size={16} color={PrimaryColors.main} />
                      <Text style={styles.distanceInfoText}>
                        {distance < 0.1 
                          ? `You are ${Math.round(distance * 1000)}m away - Ready to check in!` 
                          : `You are ${distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(2) + ' km'} away - Move closer to check in`}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.locationWarning}>
                  <Text style={styles.locationWarningText}>
                    Please enable location services to see map and check in
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.locationWarning}>
                <Text style={styles.locationWarningText}>
                  Location coordinates not available. The hospital needs to set their location when posting the job. Use "Search in Google Maps" button above to find directions using the address.
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[
                styles.checkInButton,
                checkingIn && styles.checkInButtonDisabled,
                (!currentLocation || !hasHospitalLocation || (distance !== null && distance > 0.1)) && styles.checkInButtonDisabled
              ]}
              onPress={handleCheckIn}
              disabled={checkingIn || !currentLocation || !hasHospitalLocation || (distance !== null && distance > 0.1)}
            >
              {checkingIn ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <CheckCircle size={20} color="#fff" />
                  <Text style={styles.checkInButtonText}>
                    {distance !== null && distance > 0.1 ? 'Move Closer to Check In' : 'Check In Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  scrollContainer: {
    paddingBottom: 100,
  },
  hospitalCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  hospitalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hospitalLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  hospitalLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${PrimaryColors.main}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hospitalInfo: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: `${PrimaryColors.main}10`,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactText: {
    marginLeft: 8,
    fontSize: 16,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  paymentCard: {
    backgroundColor: `${StatusColors.success}10`,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: PrimaryColors.dark,
  },
  paymentAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: StatusColors.success,
  },
  paymentRange: {
    fontSize: 18,
    fontWeight: '600',
    color: StatusColors.success,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  distanceText: {
    marginLeft: 8,
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  mapContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 12,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  directionsButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  checkedInStatus: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '100%',
  },
  pendingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  goToSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  goToSessionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 4,
  },
  statusSubtitle: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  verifiedText: {
    fontSize: 12,
    color: StatusColors.success,
    marginTop: 4,
    fontWeight: '600',
  },
  unverifiedText: {
    fontSize: 12,
    color: StatusColors.error,
    marginTop: 4,
    fontWeight: '600',
  },
  checkInSection: {
    margin: 20,
    marginTop: 0,
    padding: 16,
    backgroundColor: StatusColors.warning + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: StatusColors.warning + '30',
  },
  checkInTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 8,
    textAlign: 'center',
  },
  checkInHint: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginBottom: 12,
    textAlign: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: NeutralColors.textPrimary,
    lineHeight: 20,
  },
  checkInMapContainer: {
    marginBottom: 12,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    gap: 8,
  },
  distanceInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  locationWarning: {
    padding: 16,
    backgroundColor: StatusColors.warning + '20',
    borderRadius: 8,
    marginBottom: 12,
  },
  locationWarningText: {
    fontSize: 14,
    color: StatusColors.warning,
    textAlign: 'center',
    fontWeight: '600',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
  checkInButtonText: {
    marginLeft: 8,
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
  },
});

