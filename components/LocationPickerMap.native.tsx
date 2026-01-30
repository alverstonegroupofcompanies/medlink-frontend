import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import MapView, { Marker, Region, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import { MapPin, Navigation, ZoomIn, ZoomOut } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors } from '@/constants/hospital-theme';
import * as Location from 'expo-location';
import { UBER_LIKE_MAP_STYLE } from '@/utils/map-style';

interface LocationPickerMapProps {
  initialLatitude?: number | string;
  initialLongitude?: number | string;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: number;
  requireConfirm?: boolean;
  scrollEnabled?: boolean; // Allow disabling map scroll when inside ScrollView
}

export function LocationPickerMap({ 
  initialLatitude, 
  initialLongitude, 
  onLocationSelect, 
  height = 300,
  requireConfirm = false,
  scrollEnabled = true,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: typeof initialLatitude === 'number' ? initialLatitude : parseFloat(initialLatitude as string) || 20.5937,
    longitude: typeof initialLongitude === 'number' ? initialLongitude : parseFloat(initialLongitude as string) || 78.9629,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const latestRegionRef = useRef<Region>(region);
  const lastInitialLatRef = useRef<number | undefined>(undefined);
  const lastInitialLngRef = useRef<number | undefined>(undefined);
  const userHasInteractedRef = useRef(false);

  useEffect(() => {
    if (initialLatitude && initialLongitude) {
      const lat = typeof initialLatitude === 'number' ? initialLatitude : parseFloat(initialLatitude as string);
      const lng = typeof initialLongitude === 'number' ? initialLongitude : parseFloat(initialLongitude as string);
      
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        // Check if this is a new initial location (external change) or just a prop update from user interaction
        const isNewInitialLocation = 
          lastInitialLatRef.current === undefined || 
          lastInitialLngRef.current === undefined ||
          Math.abs(lastInitialLatRef.current - lat) > 0.0001 ||
          Math.abs(lastInitialLngRef.current - lng) > 0.0001;
        
        // Check if the new location is significantly different from the current region
        // If it's close to current region, it's likely from user interaction (map drag)
        // If it's far from current region, it's likely an external reset
        const currentRegion = latestRegionRef.current;
        const isCloseToCurrentRegion = 
          currentRegion &&
          Math.abs(currentRegion.latitude - lat) < 0.001 && // ~111 meters
          Math.abs(currentRegion.longitude - lng) < 0.001;
        
        // Only update map if:
        // 1. It's a new initial location AND user hasn't interacted yet
        // 2. OR it's a new initial location that's far from current region (external reset)
        if (isNewInitialLocation && (!userHasInteractedRef.current || !isCloseToCurrentRegion)) {
          const newRegion = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005, // Zoom in closer when selecting specific location
            longitudeDelta: 0.005,
          };
          
          setRegion(newRegion);
          latestRegionRef.current = newRegion;
          
          // Animate map to new region
          mapRef.current?.animateToRegion(newRegion, 1000);
          
          // Update refs to track this as the last known initial location
          lastInitialLatRef.current = lat;
          lastInitialLngRef.current = lng;
          
          // Reset interaction flag if it was an external reset (far from current region)
          if (!isCloseToCurrentRegion && userHasInteractedRef.current) {
            userHasInteractedRef.current = false;
          }
        } else if (isNewInitialLocation && isCloseToCurrentRegion) {
          // If it's a new initial location but close to current region (user interaction),
          // just update refs but don't move map
          lastInitialLatRef.current = lat;
          lastInitialLngRef.current = lng;
        }
        
        if (loading) setLoading(false);
        return;
      }
    }
    // Try to get current location on mount if no initial location
    if (loading && !initialLatitude && !initialLongitude) {
      getCurrentLocation();
    } else if (loading) {
      setLoading(false);
    }
  }, [initialLatitude, initialLongitude]);

  const getCurrentLocation = async () => {
    setGettingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (loading) setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      setRegion(newRegion);
      latestRegionRef.current = newRegion;
      userHasInteractedRef.current = true;
      lastInitialLatRef.current = location.coords.latitude;
      lastInitialLngRef.current = location.coords.longitude;
      mapRef.current?.animateToRegion(newRegion, 1000);
      if (!requireConfirm) {
        onLocationSelect(location.coords.latitude, location.coords.longitude);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('Error getting current location:', error);
      }
    } finally {
      setGettingLocation(false);
      if (loading) setLoading(false);
    }
  };

  const handleZoomIn = () => {
    const newDelta = Math.max(0.001, region.latitudeDelta * 0.5);
    const newRegion = {
      ...region,
      latitudeDelta: newDelta,
      longitudeDelta: newDelta,
    };
    setRegion(newRegion);
    latestRegionRef.current = newRegion;
    userHasInteractedRef.current = true;
    mapRef.current?.animateToRegion(newRegion, 300);
    if (!requireConfirm) {
      onLocationSelect(newRegion.latitude, newRegion.longitude);
    }
  };

  const handleZoomOut = () => {
    const newDelta = Math.min(0.5, region.latitudeDelta * 2);
    const newRegion = {
      ...region,
      latitudeDelta: newDelta,
      longitudeDelta: newDelta,
    };
    setRegion(newRegion);
    latestRegionRef.current = newRegion;
    userHasInteractedRef.current = true;
    mapRef.current?.animateToRegion(newRegion, 300);
    if (!requireConfirm) {
      onLocationSelect(newRegion.latitude, newRegion.longitude);
    }
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    // IMPORTANT: don't setState here when MapView is controlled (avoids infinite loops).
    // Track latest region in a ref and only commit to parent when desired.
    latestRegionRef.current = newRegion;
    
    // Mark that user has interacted with the map
    userHasInteractedRef.current = true;
    
    if (!requireConfirm) {
      onLocationSelect(newRegion.latitude, newRegion.longitude);
    }
  };

  const handleConfirm = () => {
    const r = latestRegionRef.current;
    onLocationSelect(r.latitude, r.longitude);
  };

  if (loading) {
    return (
      <View style={[styles.container, { height, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading map...</Text>
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, { height }]} 
      collapsable={false}
    >
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={true}
        showsMyLocationButton={false}
        customMapStyle={UBER_LIKE_MAP_STYLE as any}
        showsBuildings={true}
        rotateEnabled={scrollEnabled}
        pitchEnabled={scrollEnabled}
        scrollEnabled={scrollEnabled}
        zoomEnabled={scrollEnabled}
        zoomControlEnabled={false}
        onPanDrag={() => {
          // Allow map interaction but don't block parent scroll
        }}
      >
      </MapView>
      
      {/* Center Pin Overlay */}
      <View style={styles.pinOverlay} pointerEvents="none">
        <MapPin size={40} color={PrimaryColors.main} fill={PrimaryColors.main} />
        <View style={styles.pinShadow} />
      </View>

      {/* Current Location Button */}
      <TouchableOpacity
        style={styles.currentLocationButton}
        onPress={getCurrentLocation}
        disabled={gettingLocation}
        activeOpacity={0.8}
      >
        {gettingLocation ? (
          <ActivityIndicator size="small" color={PrimaryColors.main} />
        ) : (
          <Navigation size={22} color={PrimaryColors.main} />
        )}
      </TouchableOpacity>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={[styles.zoomButton, styles.zoomInButton]}
          onPress={handleZoomIn}
          activeOpacity={0.8}
        >
          <ZoomIn size={20} color={PrimaryColors.main} />
        </TouchableOpacity>
        <View style={styles.zoomDivider} />
        <TouchableOpacity
          style={[styles.zoomButton, styles.zoomOutButton]}
          onPress={handleZoomOut}
          activeOpacity={0.8}
        >
          <ZoomOut size={20} color={PrimaryColors.main} />
        </TouchableOpacity>
      </View>

      {requireConfirm && (
        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} activeOpacity={0.85}>
          <Text style={styles.confirmButtonText}>Use This Location</Text>
        </TouchableOpacity>
      )}

      {/* Instruction Overlay */}
      <View style={styles.instructionOverlay} pointerEvents="none">
        <Text style={styles.instructionText}>Drag map to pin location</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
    position: 'relative',
  },
  map: {
    flex: 1,
    width: '100%',
  },
  pinOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 40, // Adjust to make the pin point exactly at center
  },
  pinShadow: {
    width: 10,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 5,
    marginTop: 2,
  },
  instructionOverlay: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  currentLocationButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  zoomControls: {
    position: 'absolute',
    top: 72,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  zoomInButton: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  zoomOutButton: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  zoomDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  confirmButton: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: PrimaryColors.main,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
