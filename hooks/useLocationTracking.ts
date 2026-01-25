import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '../app/api'; // Adjust based on your API import path
import {
  LIVE_LOCATION_ENABLED_KEY,
  LIVE_LOCATION_SESSION_KEY,
  LIVE_LOCATION_TASK,
} from '@/utils/live-location-task';

// Configuration
const LOCATION_UPDATE_INTERVAL = 3000; // 3 seconds
const DISTANCE_FILTER = 5; // 5 meters

export const useLocationTracking = () => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [permissionDialog, setPermissionDialog] = useState<{
      visible: boolean;
      title: string;
      message: string;
    }>({
      visible: false,
      title: '',
      message: '',
    });
    const subscriberRef = useRef<Location.LocationSubscription | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const sessionIdRef = useRef<number | undefined>(undefined);
    const lastDialogKeyRef = useRef<string | null>(null);

    const showPermissionDialog = (key: string, title: string, message: string) => {
      // Prevent flicker/spam: don't show the same dialog repeatedly.
      if (permissionDialog.visible) return;
      if (lastDialogKeyRef.current === key) return;
      lastDialogKeyRef.current = key;
      setPermissionDialog({ visible: true, title, message });
    };

    const startTracking = async (sessionId?: number, opts?: { interactive?: boolean }) => {
        if (sessionId) sessionIdRef.current = sessionId;
        const interactive = opts?.interactive ?? true;

        try {
            // Check if permission is already granted
            const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
            
            // Only request permission if not already granted
            let status = currentStatus;
            if (status !== 'granted') {
                // Check if GPS is enabled
                const locationEnabled = await Location.hasServicesEnabledAsync();
                if (!locationEnabled) {
                    if (interactive) {
                      showPermissionDialog(
                        'gps_disabled',
                        'Turn on Location Services',
                        'Please enable GPS/Location Services in your device settings to share your live location with the hospital.'
                      );
                    }
                    setErrorMsg('GPS is not enabled');
                    return;
                }
                
                // Request permission
                const { status: requestedStatus } = await Location.requestForegroundPermissionsAsync();
                status = requestedStatus;
            }
            
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                if (interactive) {
                  showPermissionDialog(
                    'fg_permission_denied',
                    'Allow Location Permission',
                    'Location permission is required to share your live location with the hospital. Please allow location access in settings.'
                  );
                }
                return;
            }

            // Request background permissions (needed to keep tracking when app is minimized / user navigates away)
            const { status: bgCurrent } = await Location.getBackgroundPermissionsAsync();
            let bgStatus = bgCurrent;
            if (bgStatus !== 'granted') {
              const req = await Location.requestBackgroundPermissionsAsync();
              bgStatus = req.status;
            }

            if (bgStatus !== 'granted') {
              if (interactive) {
                showPermissionDialog(
                  'bg_permission_denied',
                  'Enable Background Location',
                  Platform.OS === 'android'
                    ? 'To keep sharing your live location after you minimize the app, allow "All the time" location access.'
                    : 'To keep sharing your live location after you minimize the app, allow "Always" location access.'
                );
              }
              // Still allow foreground tracking if background is denied.
            }

            // Persist session + enabled flag so the background task can keep updating the server.
            if (sessionIdRef.current) {
              await AsyncStorage.setItem(
                LIVE_LOCATION_SESSION_KEY,
                JSON.stringify({ sessionId: sessionIdRef.current })
              );
              await AsyncStorage.setItem(LIVE_LOCATION_ENABLED_KEY, 'true');
            }

            // Call backend to mark location_sharing_status active (required for hospital to see the doctor).
            // This is safe to call multiple times; backend handles "already started".
            if (sessionIdRef.current) {
              const firstLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
              await API.post('/doctor/start-tracking', {
                job_session_id: sessionIdRef.current,
                latitude: firstLoc.coords.latitude,
                longitude: firstLoc.coords.longitude,
              });
              setLocation(firstLoc);
            }

            // Start background updates (Android uses foreground service notification automatically when configured)
            const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
            if (!alreadyStarted) {
              await Location.startLocationUpdatesAsync(LIVE_LOCATION_TASK, {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,
                distanceInterval: 10,
                // Keep tracking active when app is backgrounded
                pausesUpdatesAutomatically: false,
                showsBackgroundLocationIndicator: true,
                foregroundService: Platform.OS === 'android' ? {
                  notificationTitle: 'Live location sharing',
                  notificationBody: 'Sharing your location with the hospital',
                } : undefined,
              });
            }

            setIsTracking(true);

            // Foreground watcher: keeps the UI responsive when user is on the page.
            subscriberRef.current = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: LOCATION_UPDATE_INTERVAL,
                    distanceInterval: DISTANCE_FILTER,
                },
                async (newLocation) => {
                    setLocation(newLocation);

                    // Throttle server updates
                    const now = Date.now();
                    if (now - lastUpdateRef.current > LOCATION_UPDATE_INTERVAL) {
                        await sendLocationToServer(newLocation);
                        lastUpdateRef.current = now;
                    }
                }
            );
        } catch (err: any) {
            // Keep message user-friendly (avoid raw error text that looks like a console dump)
            setErrorMsg('Unable to start live location sharing. Please check your location permission and try again.');
            setIsTracking(false);
        }
    };

    const stopTracking = async () => {
        if (subscriberRef.current) {
            await subscriberRef.current.remove();
            subscriberRef.current = null;
        }
        try {
          const started = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
          if (started) {
            await Location.stopLocationUpdatesAsync(LIVE_LOCATION_TASK);
          }
        } catch {
          // ignore
        }
        await AsyncStorage.multiRemove([LIVE_LOCATION_SESSION_KEY, LIVE_LOCATION_ENABLED_KEY]);
        setIsTracking(false);
        sessionIdRef.current = undefined;
    };

    const sendLocationToServer = async (loc: Location.LocationObject) => {
        try {
            // Assuming you have an auth token stored logic in API wrapper
            // Adjust endpoint if needed
            await API.post('/doctor/update-location', {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                job_session_id: sessionIdRef.current,
                // location_updated_at: new Date().toISOString(), // Backend sets this
                // speed: loc.coords.speed,
                // heading: loc.coords.heading,
            });
        } catch (error) {
            console.log('Failed to send location update', error);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (subscriberRef.current) {
                subscriberRef.current.remove();
            }
        };
    }, []);

    return {
      location,
      isTracking,
      startTracking,
      stopTracking,
      errorMsg,
      permissionDialog,
      closePermissionDialog: () => setPermissionDialog((p) => ({ ...p, visible: false })),
    };
};
