import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import MapView, { Marker, Polyline } from 'react-native-maps';

interface DoctorLocation {
  doctor_id: number;
  doctor_name: string;
  latitude: number;
  longitude: number;
  department?: string;
  check_in_verified?: boolean;
}

interface LiveTrackingMapProps {
  hospital: {
    latitude: number;
    longitude: number;
    name: string;
  };
  doctors: DoctorLocation[];
  height?: number;
  initialRegion?: any;
}

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

// Fetch directions from OSRM (Free, no API key needed!)
const fetchDirections = async (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): Promise<{ latitude: number; longitude: number }[]> => {
  try {
    // Using public OSRM server (completely free!)
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

export function LiveTrackingMap({ hospital, doctors, height = 400, initialRegion }: LiveTrackingMapProps) {
  // Ensure hospital coordinates are numbers
  const hospitalLat = typeof hospital.latitude === 'number' ? hospital.latitude : parseFloat(hospital.latitude || '0');
  const hospitalLng = typeof hospital.longitude === 'number' ? hospital.longitude : parseFloat(hospital.longitude || '0');

  const [region, setRegion] = useState({
    latitude: hospitalLat,
    longitude: hospitalLng,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  // Store route coordinates for each doctor
  const [routes, setRoutes] = useState<Map<number, { latitude: number; longitude: number }[]>>(new Map());
  // Store road-snapped positions for each doctor (first point of route)
  const [snappedPositions, setSnappedPositions] = useState<Map<number, { latitude: number; longitude: number }>>(new Map());

  useEffect(() => {
    if (initialRegion) {
      setRegion(initialRegion);
      return;
    }

    // Calculate region to show all doctors and hospital
    if (doctors.length > 0) {
      // Ensure all coordinates are numbers
      const validDoctors = doctors.filter(d => 
        !isNaN(parseFloat(d.latitude as any)) && !isNaN(parseFloat(d.longitude as any))
      );

      const allLats = [hospitalLat, ...validDoctors.map(d => parseFloat(d.latitude as any))].filter(l => !isNaN(l));
      const allLngs = [hospitalLng, ...validDoctors.map(d => parseFloat(d.longitude as any))].filter(l => !isNaN(l));
      
      if (allLats.length === 0 || allLngs.length === 0) return;

      const minLat = Math.min(...allLats);
      const maxLat = Math.max(...allLats);
      const minLng = Math.min(...allLngs);
      const maxLng = Math.max(...allLngs);
      
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      const latDelta = Math.max((maxLat - minLat) * 1.5, 0.02);
      const lngDelta = Math.max((maxLng - minLng) * 1.5, 0.02);
      
      setRegion({
        latitude: centerLat,
        longitude: centerLng,
        latitudeDelta: latDelta,
        longitudeDelta: lngDelta,
      });
    }
  }, [doctors, hospitalLat, hospitalLng, initialRegion]);

  // Fetch directions for all doctors
  useEffect(() => {
    const fetchAllDirections = async () => {
      const newRoutes = new Map();
      const newSnappedPositions = new Map();
      
      for (const doctor of doctors) {
        const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
        const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
        
        if (!isNaN(doctorLat) && !isNaN(doctorLng) && !isNaN(hospitalLat) && !isNaN(hospitalLng)) {
          const routeCoords = await fetchDirections(
            { latitude: doctorLat, longitude: doctorLng },
            { latitude: hospitalLat, longitude: hospitalLng }
          );
          newRoutes.set(doctor.doctor_id, routeCoords);
          
          // Use the first point of the route as the snapped position (on the road)
          // Ensure coordinates are numbers, not strings
          if (routeCoords.length > 0) {
            const firstPoint = routeCoords[0];
            newSnappedPositions.set(doctor.doctor_id, {
              latitude: typeof firstPoint.latitude === 'number' ? firstPoint.latitude : parseFloat(String(firstPoint.latitude)),
              longitude: typeof firstPoint.longitude === 'number' ? firstPoint.longitude : parseFloat(String(firstPoint.longitude)),
            });
          }
        }
      }
      
      setRoutes(newRoutes);
      setSnappedPositions(newSnappedPositions);
    };

    if (doctors.length > 0) {
      fetchAllDirections();
    }
  }, [doctors, hospitalLat, hospitalLng]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        region={region}
        showsUserLocation={false}
        showsMyLocationButton={false}
        mapType="standard"
      >
        {/* Hospital Marker */}
        {!isNaN(hospitalLat) && !isNaN(hospitalLng) && (
          <Marker
            coordinate={{
              latitude: hospitalLat,
              longitude: hospitalLng,
            }}
            title={hospital.name}
            description="Hospital Location"
          >
            <View style={styles.hospitalMarker}>
              <Text style={styles.hospitalMarkerIcon}>🏥</Text>
            </View>
          </Marker>
        )}

        {/* Doctor Markers and Routes */}
        {doctors.map((doctor) => {
          // Ensure coordinates are numbers
          const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
          const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
          
          // Only render marker if coordinates are valid
          if (isNaN(doctorLat) || isNaN(doctorLng)) {
            return null;
          }

          const routeCoords = routes.get(doctor.doctor_id) || [];
          // Use snapped position (on the road) if available, otherwise use raw GPS
          const markerPosition = snappedPositions.get(doctor.doctor_id) || { latitude: doctorLat, longitude: doctorLng };
          
          return (
            <React.Fragment key={`doctor-${doctor.doctor_id}`}>
              {/* Road Route */}
              {routeCoords.length > 0 && (
                <Polyline
                  coordinates={routeCoords}
                  strokeColor={PrimaryColors.main}
                  strokeWidth={4}
                  lineCap="round"
                  lineJoin="round"
                />
              )}

              <Marker
                coordinate={markerPosition}
                title={doctor.doctor_name}
                description={`${doctor.department || 'Doctor'} - On the way`}
              >
                <View style={styles.doctorMarkerContainer}>
                  <Image
                    source={require('../assets/images/doctor-marker.png')}
                    style={styles.doctorMarkerImage}
                    resizeMode="contain"
                  />
                </View>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  doctorMarkerContainer: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doctorMarkerImage: {
    width: 48,
    height: 48,
  },
  hospitalMarker: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  hospitalMarkerIcon: {
    fontSize: 22,
  },
});

