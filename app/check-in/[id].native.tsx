import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform,
  ActivityIndicator,
  Linking,
  AppState,
  StatusBar
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import API from '../api';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors } from '@/constants/doctor-theme';
import { ModernColors } from '@/constants/modern-theme';
import { PermissionGuard } from '@/components/PermissionGuard';
import { ScreenSafeArea } from '@/components/screen-safe-area';

export default function CheckInScreen() {
  const { id } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trackingActive, setTrackingActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [hospitalLocation, setHospitalLocation] = useState({
    latitude: 0,
    longitude: 0,
  });

  // Calculate distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/doctor/job-session/${id}`);
      const sessionData = response.data.session;
      setSession(sessionData);
      setTrackingActive(!!sessionData.tracking_started_at && !sessionData.check_in_time);
      
      // Parse hospital location
      if (sessionData.job_requirement) {
        setHospitalLocation({
          latitude: parseFloat(sessionData.job_requirement.latitude || '0'),
          longitude: parseFloat(sessionData.job_requirement.longitude || '0')
        });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      Alert.alert('Error', 'Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [id]);

  // Location Tracking Effect
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    const startLocationUpdates = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);

        // Subscribe to updates if tracking is active
        if (trackingActive) {
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 5000,
              distanceInterval: 10,
            },
            (newLocation) => {
              setCurrentLocation(newLocation);
              
              // Only update backend periodically if moved significantly or heavily relying on real-time
              // For now, reliance on background task is preferred, but we can ping for UI updates
            }
          );
        }
      } catch (err) {
        console.warn('Location error:', err);
      }
    };

    startLocationUpdates();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [trackingActive]);

  const handleCheckIn = async () => {
    if (!currentLocation) {
      Alert.alert('Waiting for GPS', 'Please wait while we get your precise location.');
      return;
    }

    try {
      setLoading(true);
      const response = await API.post('/doctor/check-in', {
        job_session_id: id,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      if (response.data.status === 'success') {
        Alert.alert('Success', 'You have successfully checked in!', [
          { text: 'OK', onPress: () => router.replace('/(tabs)/approved-applications') }
        ]);
      } else {
        const dist = response.data.distance_km ? ` (Distance: ${response.data.distance_km.toFixed(2)}km)` : '';
        Alert.alert('Check-In Failed', (response.data.message || 'You are not within range.') + dist);
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Check-in failed');
    } finally {
      setLoading(false);
    }
  };

  const openMapsNavigation = () => {
    if (!hospitalLocation.latitude) return;
    
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${hospitalLocation.latitude},${hospitalLocation.longitude}`;
    const label = 'Hospital Location';
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  if (loading && !session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
        <Text style={{ marginTop: 10 }}>Loading session...</Text>
      </View>
    );
  }

  // Calculate dynamic distance for UI
  const distanceMsg = currentLocation && hospitalLocation.latitude 
    ? calculateDistance(
        currentLocation.coords.latitude, 
        currentLocation.coords.longitude,
        hospitalLocation.latitude,
        hospitalLocation.longitude
      ).toFixed(2) + ' km away'
    : 'Calculating distance...';

  return (
    <ScreenSafeArea backgroundColor="#fff">
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <TouchableOpacity onPress={fetchSessionDetails} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={24} color={PrimaryColors.main} />
          </TouchableOpacity>
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          <PermissionGuard permissionType="location" autoRequest={true}>
            <MapView
              ref={mapRef}
              style={styles.map}
              mapType="none" // Hide default google map
              showsUserLocation={true}
              showsMyLocationButton={true}
              initialRegion={{
                latitude: hospitalLocation.latitude || 20.5937,
                longitude: hospitalLocation.longitude || 78.9629,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
            >
              <UrlTile
                urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
                flipY={false}
                zIndex={-1}
              />
              {hospitalLocation.latitude !== 0 && (
                <Marker
                  coordinate={hospitalLocation}
                  title={session?.job_requirement?.hospital?.name || "Hospital"}
                  description="Destination"
                >
                  <View style={styles.hospitalMarker}>
                    <FontAwesome5 name="hospital" size={20} color="#fff" />
                  </View>
                </Marker>
              )}
            </MapView>
          </PermissionGuard>
          
          {/* Overlay Status Card */}
          <View style={styles.statusCard}>
             <View style={styles.statusRow}>
               <View style={[styles.statusDot, { backgroundColor: trackingActive ? StatusColors.success : '#ccc' }]} />
               <Text style={styles.statusText}>
                 {trackingActive ? 'Live Location Shared' : 'Tracking Inactive'}
               </Text>
             </View>
             <Text style={styles.distanceText}>{distanceMsg}</Text>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomSheet}>
          <Text style={styles.hospitalName}>
            {session?.job_requirement?.hospital?.name || 'Hospital Name'}
          </Text>
          <Text style={styles.address}>
            {session?.job_requirement?.address || 'Hospital Address'}
          </Text>

          <View style={styles.actionButtons}>
             <TouchableOpacity style={styles.navButton} onPress={openMapsNavigation}>
               <FontAwesome5 name="directions" size={20} color="#fff" />
               <Text style={styles.navButtonText}>Navigate</Text>
             </TouchableOpacity>

             <TouchableOpacity 
               style={[styles.checkInButton, { opacity: loading ? 0.7 : 1 }]} 
               onPress={handleCheckIn}
               disabled={loading}
             >
               {loading ? (
                 <ActivityIndicator color="#fff" />
               ) : (
                 <>
                   <MaterialIcons name="check-circle" size={24} color="#fff" />
                   <Text style={styles.checkInButtonText}>I Have Arrived</Text>
                 </>
               )}
             </TouchableOpacity>
          </View>
          
          <Text style={styles.hintText}>
            Click "I Have Arrived" when you are inside the hospital.
          </Text>
        </View>
      </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  statusCard: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: '700',
    color: PrimaryColors.main,
    marginTop: 4,
  },
  hospitalMarker: {
    backgroundColor: PrimaryColors.main,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  bottomSheet: {
    padding: 24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginTop: -20, // Overlap map slightly
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  navButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  checkInButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  checkInButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
