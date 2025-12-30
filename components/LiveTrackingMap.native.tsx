interface DoctorLocation {
  doctor_id: number;
  doctor_name: string;
  latitude: number;
  longitude: number;
  department?: string;
  check_in_verified?: boolean;
  profile_photo?: string;
}

interface LiveTrackingMapProps {
  hospital: {
    latitude: number;
    longitude: number;
    name: string;
    logo?: string;
  };
  doctors: DoctorLocation[];
  height?: number;
  initialRegion?: any;
}

// ... (keep decodePolyline and fetchDirections as is, so I'll skip them in replacement if possible, but I need to replace the component body)
// I will replace the whole file content from line 7 to 291 to apply changes cleanly including imports.
// Wait, I need to verify imports. `Image` is used. I'll need `Building2` and `User` from lucide.

// Actually, I can target specific blocks. 

// Block 1: Interfaces
// Block 2: Component Body (Marker rendering)

// Let's do it in one go for the whole file to be safe with imports.

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image } from 'react-native';
import { MapPin, Building2, User } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { getFullImageUrl } from '@/utils/url-helper';

interface DoctorLocation {
  doctor_id: number;
  doctor_name: string;
  latitude: number;
  longitude: number;
  department?: string;
  check_in_verified?: boolean;
  profile_photo?: string;
  job_latitude?: number | string;
  job_longitude?: number | string;
  job_name?: string;
}

interface LiveTrackingMapProps {
  hospital: {
    latitude: number;
    longitude: number;
    name: string;
    logo?: string;
  };
  doctors: DoctorLocation[];
  height?: number;
  initialRegion?: any;
}

// ... helper functions ... (I will include them to match original)

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

// ... (imports remain)

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

    // Calculate region to show all doctors and hospital (and job sites)
    if (doctors.length > 0) {
      // Ensure all coordinates are numbers
      const validDoctors = doctors.filter(d => 
        !isNaN(parseFloat(d.latitude as any)) && !isNaN(parseFloat(d.longitude as any))
      );

      const allLats = [hospitalLat, ...validDoctors.map(d => parseFloat(d.latitude as any))];
      const allLngs = [hospitalLng, ...validDoctors.map(d => parseFloat(d.longitude as any))];
      
      // Add job locations to bounds if they exist
      validDoctors.forEach(d => {
          if (d.job_latitude && d.job_longitude) {
              allLats.push(typeof d.job_latitude === 'number' ? d.job_latitude : parseFloat(d.job_latitude));
              allLngs.push(typeof d.job_longitude === 'number' ? d.job_longitude : parseFloat(d.job_longitude));
          }
      });

      const validLats = allLats.filter(l => !isNaN(l));
      const validLngs = allLngs.filter(l => !isNaN(l));
      
      if (validLats.length === 0 || validLngs.length === 0) return;

      const minLat = Math.min(...validLats);
      const maxLat = Math.max(...validLats);
      const minLng = Math.min(...validLngs);
      const maxLng = Math.max(...validLngs);
      
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
        
        // Determine destination: Job Site if available, otherwise Hospital
        let destLat = hospitalLat;
        let destLng = hospitalLng;
        
        if (doctor.job_latitude && doctor.job_longitude) {
             const jobLat = typeof doctor.job_latitude === 'number' ? doctor.job_latitude : parseFloat(doctor.job_latitude);
             const jobLng = typeof doctor.job_longitude === 'number' ? doctor.job_longitude : parseFloat(doctor.job_longitude);
             if (!isNaN(jobLat) && !isNaN(jobLng)) {
                 destLat = jobLat;
                 destLng = jobLng;
             }
        }
        
        if (!isNaN(doctorLat) && !isNaN(doctorLng) && !isNaN(destLat) && !isNaN(destLng)) {
          const routeCoords = await fetchDirections(
            { latitude: doctorLat, longitude: doctorLng },
            { latitude: destLat, longitude: destLng }
          );
          newRoutes.set(doctor.doctor_id, routeCoords);
          
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
        mapType="none" // Use "none" to hide Google Maps and use OSM tiles
      >
        <UrlTile
          urlTemplate="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

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
              {hospital.logo ? (
                 <Image 
                    source={{ uri: getFullImageUrl(hospital.logo) }} 
                    style={styles.hospitalLogo} 
                    resizeMode="cover"
                 />
              ) : (
                 <Building2 size={22} color="#fff" />
              )}
            </View>
          </Marker>
        )}

        {/* Doctor Markers, Routes, and Job Sites */}
        {doctors.map((doctor) => {
          const doctorLat = typeof doctor.latitude === 'number' ? doctor.latitude : parseFloat(doctor.latitude || '0');
          const doctorLng = typeof doctor.longitude === 'number' ? doctor.longitude : parseFloat(doctor.longitude || '0');
          
          if (isNaN(doctorLat) || isNaN(doctorLng)) return null;

          const routeCoords = routes.get(doctor.doctor_id) || [];
          const markerPosition = snappedPositions.get(doctor.doctor_id) || { latitude: doctorLat, longitude: doctorLng };
          
          // Determine if we should show a specific Job Marker
          let showJobMarker = false;
          let jobLat = 0, jobLng = 0;
          if (doctor.job_latitude && doctor.job_longitude) {
              jobLat = typeof doctor.job_latitude === 'number' ? doctor.job_latitude : parseFloat(doctor.job_latitude);
              jobLng = typeof doctor.job_longitude === 'number' ? doctor.job_longitude : parseFloat(doctor.job_longitude);
              
              // Show job marker if it exists and is valid
              if (!isNaN(jobLat) && !isNaN(jobLng)) {
                   // Always show job marker if it's defined, to be safe and clear for the user
                   showJobMarker = true;
              }
          }

          return (
            <React.Fragment key={`doctor-${doctor.doctor_id}`}>
              {/* Job Location Marker */}
              {showJobMarker && (
                  <Marker
                    coordinate={{ latitude: jobLat, longitude: jobLng }}
                    title={doctor.job_name || "Job Location"}
                    description={`Job Site for ${doctor.doctor_name}`}
                  >
                    <View style={[styles.hospitalMarker, { backgroundColor: '#F59E0B' }]}>
                        <Building2 size={18} color="#fff" />
                    </View>
                  </Marker>
              )}
            
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
                description={`${doctor.department || 'Doctor'} - ${showJobMarker ? 'En route to Job Site' : 'Active'}`}
              >
                <View style={styles.doctorMarkerContainer}>
                   <View style={styles.doctorMarker}>
                       {doctor.profile_photo ? (
                           <Image 
                                source={{ uri: getFullImageUrl(doctor.profile_photo) }} 
                                style={styles.doctorImage}
                                resizeMode="cover"
                           />
                       ) : (
                           <User size={24} color="#fff" />
                       )}
                   </View>
                   <View style={styles.markerArrow} />
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
      alignItems: 'center',
      justifyContent: 'center',
      width: 60,
      height: 60,
    },
    doctorMarker: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#2563EB',
      borderWidth: 3,
      borderColor: '#fff',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
    },
    doctorImage: {
      width: '100%',
      height: '100%',
    },
    // No arrow for "Uber-like", just a clean circle floating
    markerArrow: {
        display: 'none', 
    },
    hospitalMarker: {
      backgroundColor: '#10B981',
      borderRadius: 24,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 6,
      borderWidth: 3,
      borderColor: '#fff',
      overflow: 'hidden',
    },
    hospitalLogo: {
      width: '100%',
      height: '100%',
    },
    hospitalMarkerIcon: {
      fontSize: 22,
    },
  });

