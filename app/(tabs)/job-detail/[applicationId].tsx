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
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Building2, 
  Navigation, 
  ArrowLeft, 
  DollarSign,
  Share2,
  Calendar,
  AlertTriangle,
  Check
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { ModernColors } from '@/constants/modern-theme';
import API from '../../api';
import * as Location from 'expo-location';
import { CheckInMapView } from '@/components/CheckInMapView';
import { StopwatchTimer } from '@/components/StopwatchTimer';

const { width } = Dimensions.get('window');

export default function JobDetailScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');

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
      
      // Pre-fill address if available
      // Pre-fill address: Priority to job requirement custom address
      // If custom location exists but no text address, show placeholder instead of falling back to hospital default
      if (app?.job_requirement?.address) {
        setAddress(app.job_requirement.address);
      } else if (app?.job_requirement?.latitude && app?.job_requirement?.longitude) {
         setAddress("Custom Location (See Map)");
      } else if (app?.job_requirement?.hospital?.address) {
         setAddress(app.job_requirement.hospital.address);
      } else {
         setAddress('Location details not available');
      }

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

    const hospital = application.job_requirement.hospital;
    // Check job requirement specific location first, then fallback to hospital location
    const latRaw = application.job_requirement?.latitude || hospital?.latitude;
    const lngRaw = application.job_requirement?.longitude || hospital?.longitude;
    
    const lat = latRaw ? Number(latRaw) : null;
    const lng = lngRaw ? Number(lngRaw) : null;
    
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

  const handleStartTracking = async () => {
    console.log('handleStartTracking called');
     // This is "Share Live Location"
    let sessionId = application.job_session?.id;
    console.log('Session ID:', sessionId);
    
    if (!sessionId) {
      Alert.alert('Notice', 'No active session found for this job yet.');
      return;
    }

    if (application.job_session?.tracking_started_at) {
      Alert.alert('Already Tracking', 'Location tracking is already active.');
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to start tracking.');
        return;
      }

      setCheckingIn(true); 

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      await API.post('/doctor/start-tracking', {
        job_session_id: sessionId,
        latitude,
        longitude,
      });

      Alert.alert(
        'Location Shared!',
        'You are now sharing your live location with the hospital.',
        [{ text: 'OK', onPress: () => loadApplication() }]
      );
    } catch (error: any) {
      console.error('Start tracking error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start location tracking');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckIn = async () => {
    console.log('handleCheckIn called');
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services to check in.');
      return;
    }
    
    // Allow check-in attempt for feedback even if far, but block api call
    if (distance && distance > 0.1) { // 0.1 km = 100m
        Alert.alert('Too Far to Check In', `You are ${distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(2) + 'km'} away.\n\nYou must be within 100m of the hospital to check in.`);
        return;
    }

    let sessionId = application.job_session?.id;
    if (!sessionId) {
         // Try reload to be safe
         await loadApplication();
         sessionId = application?.job_session?.id;
         if(!sessionId) {
             Alert.alert('Error', 'Session not active yet. Please wait for hospital approval.');
             return;
         }
    }

    try {
      setCheckingIn(true);
      const response = await API.post('/doctor/check-in', {
        job_session_id: sessionId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });

      if (response.data.check_in_verified) {
         Alert.alert('Success', 'Checked in successfully!', [
             { text: 'OK', onPress: () => loadApplication() }
         ]);
      } else {
           Alert.alert('Check-In Failed', response.data.message || 'Could not verify location.');
      }

    } catch (error: any) {
        console.log('Check in error', error);
        Alert.alert('Error', error.response?.data?.message || 'Check-in failed');
    } finally {
        setCheckingIn(false);
    }
  };
  
  const openMaps = () => {
      const hospital = application?.job_requirement?.hospital;
      // Prioritize job location over hospital default
      const lat = application?.job_requirement?.latitude || hospital?.latitude;
      const lng = application?.job_requirement?.longitude || hospital?.longitude;
      const label = encodeURIComponent(hospital?.name || "Hospital");

      if (lat && lng) {
          const url = Platform.select({
              ios: `maps:0,0?q=${label}@${lat},${lng}`,
              android: `geo:0,0?q=${lat},${lng}(${label})`
          });
          if(url) Linking.openURL(url);
      } else {
          // Fallback to address query
          const query = encodeURIComponent(address);
          const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
          Linking.openURL(url);
      }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ModernColors.primary.main} />
      </View>
    );
  }

  if (!application) return null;

  const hospital = application.job_requirement?.hospital;
  const session = application.job_session;
  const isCheckedIn = !!session?.check_in_time;
  const isSharingLive = !!session?.tracking_started_at;
  
  // Parse time
  const startTime = application.job_requirement?.start_time || "09:00:00";
  const endTime = application.job_requirement?.end_time || "17:00:00";
  const formattedTime = `${startTime.substring(0,5)} - ${endTime.substring(0,5)}`;
  
  const workDate = new Date(application.job_requirement?.work_required_date || Date.now());
  const formattedDate = workDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  // Map Data
  // Map Data: Priority to job specific location
  const hospitalLat = Number(application.job_requirement?.latitude || hospital?.latitude || 0);
  const hospitalLng = Number(application.job_requirement?.longitude || hospital?.longitude || 0);
  const hasLocation = hospitalLat !== 0 && hospitalLng !== 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor={ModernColors.primary.main} />
      {/* Header */}
      <LinearGradient
          colors={ModernColors.primary.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 40 }} /> 
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hospital Profile */}
        <View style={styles.hospitalSection}>
            <View style={styles.logoContainer}>
                {hospital?.logo_url ? (
                    <Image source={{ uri: hospital.logo_url }} style={styles.logo} />
                ) : (
                    <Building2 size={32} color={ModernColors.primary.main} />
                )}
            </View>
            <Text style={styles.hospitalName}>{hospital?.name || 'Hospital Name'}</Text>
            <Text style={styles.departmentName}>{application.job_requirement?.department || 'General Medicine'}</Text>
        </View>

        {/* Status Banner (if checked in) */}
        {isCheckedIn && (
            <View style={styles.timerCard}>
                 <Text style={styles.timerLabel}>Session Active</Text>
                 <StopwatchTimer startTime={session.check_in_time} />
                 <Text style={styles.checkedInTime}>Checked in at {new Date(session.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
        )}

        {/* Key Details Grid */}
        <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Calendar size={20} color="#0284C7" />
                </View>
                <Text style={styles.gridLabel}>Date</Text>
                <Text style={styles.gridValue}>{formattedDate}</Text>
            </View>
            
            <View style={styles.gridItem}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Clock size={20} color="#D97706" />
                </View>
                <Text style={styles.gridLabel}>Time</Text>
                <Text style={styles.gridValue}>{formattedTime}</Text>
            </View>

            <View style={styles.gridItem}>
                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                    <DollarSign size={20} color="#16A34A" />
                </View>
                <Text style={styles.gridLabel}>Fees</Text>
                <Text style={styles.gridValue}>₹{session?.payment_amount || application.job_requirement?.salary_range_min || '0'}</Text>
            </View>
        </View>

        {/* Location & Map Section */}
        <View style={styles.mapSection}>
             <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>Location</Text>
                 {distance !== null && (
                     <View style={styles.distanceBadge}>
                         <Navigation size={12} color="#fff" />
                         <Text style={styles.distanceText}>
                             {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`}
                         </Text>
                     </View>
                 )}
             </View>
             
             <Text style={styles.addressText} numberOfLines={2}>{address}</Text>

             <View style={styles.mapContainer}>
                 {hasLocation && currentLocation ? (
                     <CheckInMapView 
                        hospitalLocation={{ latitude: hospitalLat, longitude: hospitalLng, name: hospital?.name || 'Hospital' }}
                        doctorLocation={currentLocation}
                        height={220}
                     />
                 ) : (
                     <View style={styles.mapPlaceholder}>
                         <Text style={{color: NeutralColors.textSecondary}}>Map loading or location unavailable...</Text>
                     </View>
                 )}
                 
                 <TouchableOpacity style={styles.navButton} onPress={openMaps}>
                     <Navigation size={16} color="#fff" />
                 </TouchableOpacity>
             </View>
        </View>


        {/* Action Buttons */}
        {!isCheckedIn && (
            <View style={styles.actionContainer}>
                
                {/* 100m Reminder - Only show if not waiting to check in */}
                {/* Actually, always show inside 100m hint */}
                <View style={styles.checkInInfo}>
                    <Text style={styles.checkInHint}>
                         <MapPin size={12} color={NeutralColors.textSecondary} /> 100m inside to check in
                    </Text>
                </View>
                
                {/* Mandatory Share Live Reminder */}
                {!isSharingLive && (
                    <View style={styles.reminderBox}>
                        <AlertTriangle size={16} color="#D97706" />
                        <Text style={styles.reminderText}>
                           Mandatory: Share live location to ensure availability.
                        </Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    {/* Share Live Button */}
                    <TouchableOpacity 
                        style={[
                            styles.actionButton, 
                            isSharingLive ? styles.successBtn : styles.primaryBtn,
                             // If sharing, it becomes small (flex: 0 or explicit width) managed by container if needed
                             isSharingLive && { flex: 0, width: 60, backgroundColor: '#DCFCE7' } 
                        ]}
                        onPress={handleStartTracking}
                        disabled={isSharingLive}
                    >
                        {isSharingLive ? (
                             <Check size={24} color="#16A34A" />
                        ) : (
                             <>
                                <Share2 size={20} color="#fff" />
                                <Text style={styles.btnTextPrimary}>Share Live Location</Text>
                             </>
                        )}
                    </TouchableOpacity>

                    {/* Check In Button - Only fully prominent if sharing live is done? User didn't say that, but likely. 
                        User said "share live shud be seen as mandotry... after click only tick shud be seen before that full blue button"
                        So if Shared -> Tick. Then Check In is available.
                    */}
                    <TouchableOpacity 
                        style={[
                            styles.actionButton, 
                            styles.primaryBtn,
                            (checkingIn || (distance && distance > 0.1)) ? styles.disabledBtn : null,
                            // If sharing is NOT done, maybe disable check in? Or just keep parallel. User said mandatory.
                            // I won't force disable check-in via code unless requested, but visual emphasis is on Share first.
                        ]}
                        onPress={handleCheckIn}
                        disabled={checkingIn}
                    >
                        {checkingIn ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MapPin size={20} color="#fff" />
                                <Text style={styles.btnTextPrimary}>Check In</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    // Background color removed in favor of gradient, no border bottom
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hospitalSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    // Add top spacing if user scrolls up? 
    // Actually, normally header is sticky or fixed. Here it is fixed.
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  departmentName: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  timerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timerLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  checkedInTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  mapSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E', // Green
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: ModernColors.primary.main, // Updated to ModernColors
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  checkInInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInHint: {
    fontSize: 12,
    color: '#64748B',
  },
  reminderBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  reminderText: {
    fontSize: 12,
    color: '#D97706',
    flex: 1,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: ModernColors.primary.main,
  },
  primaryBtn: {
    backgroundColor: ModernColors.primary.main,
  },
  successBtn: {
     backgroundColor: '#DCFCE7',
     borderColor: '#16A34A',
     borderWidth: 1,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
