import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MapPin, Building2, Navigation, Clock, ChevronLeft, Map } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import API from '../api';
import { LiveTrackingMap } from '@/components/LiveTrackingMap';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function DoctorLiveTrackingScreen() {
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const pollIntervalRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadSessionData();
      getCurrentLocation();
      startPolling();

      return () => {
        stopPolling();
      };
    }, [])
  );

  const startPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      getCurrentLocation();
      if (currentSession) {
        calculateDistanceAndETA();
      }
    }, 5000); // Poll every 5 seconds
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadSessionData = async () => {
    try {
      // Get all sessions and find active one
      const response = await API.get('/doctor/sessions');
      const sessions = response.data?.sessions || [];
      
      // Find active session (scheduled or in_progress)
      const activeSession = sessions.find((s: any) => 
        s.status === 'scheduled' || s.status === 'in_progress'
      );
      
      if (activeSession) {
        setCurrentSession(activeSession);
        
        // Get hospital/job location
        const hospitalData = activeSession.job_requirement?.hospital;
        const jobLat = activeSession.job_requirement?.latitude || hospitalData?.latitude;
        const jobLng = activeSession.job_requirement?.longitude || hospitalData?.longitude;
        
        if (hospitalData) {
          const hospitalLat = typeof hospitalData.latitude === 'number' 
            ? hospitalData.latitude 
            : parseFloat(hospitalData.latitude || '0');
          const hospitalLng = typeof hospitalData.longitude === 'number' 
            ? hospitalData.longitude 
            : parseFloat(hospitalData.longitude || '0');
          
          setHospital({
            ...hospitalData,
            latitude: jobLat || hospitalLat,
            longitude: jobLng || hospitalLng,
            name: hospitalData.name || 'Hospital',
          });
        }
      }
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Error loading session:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for live tracking.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(newLocation);

      // Update location on server if session exists
      if (currentSession?.id) {
        try {
          await API.post('/doctor/update-location', {
            session_id: currentSession.id,
            latitude: newLocation.latitude,
            longitude: newLocation.longitude,
          });
        } catch (error) {
          console.error('Error updating location:', error);
        }
      }

      if (hospital) {
        calculateDistanceAndETA(newLocation);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistanceAndETA = async (location?: { latitude: number; longitude: number }) => {
    const loc = location || currentLocation;
    if (!loc || !hospital) return;

    const hospitalLat = typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude || '0');
    const hospitalLng = typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude || '0');

    if (isNaN(hospitalLat) || isNaN(hospitalLng)) return;

    // Calculate distance
    const calculatedDistance = calculateDistance(
      loc.latitude,
      loc.longitude,
      hospitalLat,
      hospitalLng
    );

    setDistance(calculatedDistance);

    // Calculate ETA (assuming average speed of 30 km/h)
    const etaMinutes = Math.round((calculatedDistance / 30) * 60);
    setEta(etaMinutes);

    // Fetch route
    try {
      const route = await fetchDirections(
        { latitude: loc.latitude, longitude: loc.longitude },
        { latitude: hospitalLat, longitude: hospitalLng }
      );
      setRouteCoords(route);
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  useEffect(() => {
    if (currentLocation && hospital) {
      calculateDistanceAndETA();
    }
  }, [currentLocation, hospital]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  // Decode Google Maps polyline
  const decodePolyline = (encoded: string): { latitude: number; longitude: number }[] => {
    const poly = [];
    let index = 0;
    const len = encoded.length;
    let lat = 0;
    let lng = 0;

    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      poly.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      });
    }
    return poly;
  };

  // Fetch directions from OSRM
  const fetchDirections = async (
    start: { latitude: number; longitude: number },
    end: { latitude: number; longitude: number }
  ): Promise<{ latitude: number; longitude: number }[]> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=polyline`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const points = data.routes[0].geometry;
        return decodePolyline(points);
      }
    } catch (error) {
      console.error('Error fetching directions:', error);
    }

    // Fallback to straight line
    return [start, end];
  };

  const openNavigation = () => {
    if (!hospital) return;

    const hospitalLat = typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude || '0');
    const hospitalLng = typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude || '0');
    const label = encodeURIComponent(hospital.name || 'Hospital');

    if (hospitalLat && hospitalLng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${label}@${hospitalLat},${hospitalLng}`,
        android: `google.navigation:q=${hospitalLat},${hospitalLng}`,
      });
      
      if (url) {
        Linking.openURL(url).catch(() => {
          // Fallback to Google Maps
          const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${hospitalLat},${hospitalLng}`;
          Linking.openURL(fallbackUrl);
        });
      }
    }
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={NeutralColors.background}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading tracking data...</Text>
        </View>
      </ScreenSafeArea>
    );
  }

  if (!currentSession) {
    return (
      <ScreenSafeArea backgroundColor={PrimaryColors.main} statusBarStyle="light-content">
        <View style={styles.container}>
          <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Live Tracking</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.emptyContainer}>
            <MapPin size={64} color={NeutralColors.textTertiary} />
            <Text style={styles.emptyTitle}>No Active Session</Text>
            <Text style={styles.emptyText}>
              You need an active job session to use live tracking. Start a session to see your location and navigation.
            </Text>
          </View>
        </View>
      </ScreenSafeArea>
    );
  }

  const hospitalLat = typeof hospital?.latitude === 'number' ? hospital.latitude : parseFloat(hospital?.latitude || '0');
  const hospitalLng = typeof hospital?.longitude === 'number' ? hospital.longitude : parseFloat(hospital?.longitude || '0');

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.main} statusBarStyle="light-content">
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Live Tracking</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {currentLocation && hospital && !isNaN(hospitalLat) && !isNaN(hospitalLng) ? (
            <LiveTrackingMap
              hospital={{
                latitude: hospitalLat,
                longitude: hospitalLng,
                name: hospital.name || 'Hospital',
              }}
              doctors={[{
                doctor_id: 0,
                doctor_name: 'You',
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                job_latitude: hospitalLat,
                job_longitude: hospitalLng,
                job_name: hospital.name || 'Hospital',
              }]}
              height={height * 0.50}
            />
          ) : (
            <View style={styles.mapPlaceholder}>
              <MapPin size={40} color={NeutralColors.textSecondary} />
              <Text style={styles.mapPlaceholderText}>
                Waiting for location...
              </Text>
            </View>
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={styles.infoHeaderLeft}>
              <Building2 size={20} color={PrimaryColors.main} />
              <Text style={styles.hospitalName}>{hospital?.name || 'Hospital'}</Text>
            </View>
            {currentSession?.job_requirement?.department && (
              <Text style={styles.department}>{currentSession.job_requirement.department}</Text>
            )}
          </View>

          {/* Distance and ETA */}
          <View style={styles.metricsRow}>
            {distance !== null ? (
              <View style={styles.metricItem}>
                <Navigation size={16} color={PrimaryColors.main} />
                <Text style={styles.metricValue}>
                  {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`}
                </Text>
                <Text style={styles.metricLabel}>Distance</Text>
              </View>
            ) : null}
            
            {eta !== null ? (
              <View style={styles.metricItem}>
                <Clock size={16} color={PrimaryColors.main} />
                <Text style={styles.metricValue}>~{eta} min</Text>
                <Text style={styles.metricLabel}>ETA</Text>
              </View>
            ) : null}
          </View>

          {/* Navigation Button */}
          {hospital && (
            <TouchableOpacity
              style={styles.navigationButton}
              onPress={openNavigation}
              activeOpacity={0.8}
            >
              <Map size={20} color="#fff" />
              <Text style={styles.navigationButtonText}>Open Navigation</Text>
            </TouchableOpacity>
          )}
        </View>
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: PrimaryColors.main,
  },
  backButton: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  mapContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  mapPlaceholder: {
    height: height * 0.50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.background,
  },
  mapPlaceholderText: {
    marginTop: 16,
    fontSize: 15,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NeutralColors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: NeutralColors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginTop: 24,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoHeader: {
    marginBottom: 16,
  },
  infoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  hospitalName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  department: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.main,
    marginTop: 8,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PrimaryColors.main,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
