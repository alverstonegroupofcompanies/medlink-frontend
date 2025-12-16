/**
 * Location Tracker Service
 * Handles GPS tracking for doctor trips with foreground/background support.
 */

import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/app/api';

const ACTIVE_TRIP_STORAGE_KEY = 'doctorActiveTripMeta';

export type TripStatus = 'started' | 'on_the_way' | 'arrived' | 'completed' | 'cancelled';

export interface TripData {
  id: number;
  job_session_id: number;
  hospital_id: number;
  status: TripStatus;
  current_latitude: number | null;
  current_longitude: number | null;
  destination_latitude: number | null;
  destination_longitude: number | null;
  distance_km: number | null;
  estimated_duration_seconds?: number;
}

type StatusCallback = (status: TripStatus) => void;
type LocationCallback = (location: Location.LocationObject) => void;

class LocationTracker {
  private tripId: number | null = null;
  private sessionId: number | null = null;
  private isTracking = false;
  private currentStatus: TripStatus = 'started';
  private statusListener?: StatusCallback;
  private locationListener?: LocationCallback;
  private locationSubscription: Location.LocationSubscription | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private lastUpdateTimestamp = 0;
  private retryCount = 0;
  private readonly maxRetries = 3;
  private readonly minUpdateInterval = 6000; // ms

  /**
   * Start a brand-new trip for a session.
   */
  async startTracking(
    sessionId: number,
    onStatusChange?: StatusCallback,
    onLocationUpdate?: LocationCallback
  ): Promise<{ success: boolean; trip?: TripData; error?: string }> {
    try {
      const hasPermission = await this.ensurePermissions(true);
      if (!hasPermission) {
        return {
          success: false,
          error: 'Location permission denied. Enable location services to start live tracking.',
        };
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const response = await API.post('/doctor/trips/start', {
        job_session_id: sessionId,
        start_latitude: currentLocation.coords.latitude,
        start_longitude: currentLocation.coords.longitude,
      });

      if (!response.data?.trip) {
        return {
          success: false,
          error: response.data?.message || 'Unable to start trip. Please try again.',
        };
      }

      this.tripId = response.data.trip.id;
      this.sessionId = sessionId;
      this.statusListener = onStatusChange;
      this.locationListener = onLocationUpdate;
      this.currentStatus = response.data.trip.status || 'started';
      this.isTracking = true;

      await this.persistActiveTrip();
      await this.beginTrackingLoop();

      return {
        success: true,
        trip: response.data.trip,
      };
    } catch (error: any) {
      console.error('Error starting trip tracking:', error?.response?.data || error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Failed to start live tracking.',
      };
    }
  }

  /**
   * Resume tracking for an already active trip (after app reload).
   */
  async resumeExistingTrip(
    tripId: number,
    sessionId: number,
    initialStatus: TripStatus = 'started',
    onStatusChange?: StatusCallback,
    onLocationUpdate?: LocationCallback
  ): Promise<{ success: boolean; error?: string }> {
    const hasPermission = await this.ensurePermissions(false);
    if (!hasPermission) {
      return {
        success: false,
        error: 'Location permission required to continue live tracking.',
      };
    }

    this.tripId = tripId;
    this.sessionId = sessionId;
    this.currentStatus = initialStatus;
    this.statusListener = onStatusChange;
    this.locationListener = onLocationUpdate;
    this.isTracking = true;

    await this.persistActiveTrip();
    await this.beginTrackingLoop();

    return { success: true };
  }

  /**
   * Fetch active trip for a session.
   */
  async getActiveTrip(sessionId: number): Promise<TripData | null> {
    try {
      const response = await API.get(`/doctor/trips/session/${sessionId}`);
      return response.data?.trip || null;
    } catch (error) {
      console.error('Error fetching active trip:', error?.response?.data || error);
      return null;
    }
  }

  /**
   * Complete trip and stop tracking.
   */
  async completeTrip(): Promise<{ success: boolean; error?: string }> {
    if (!this.tripId) {
      return { success: false, error: 'No active trip in progress.' };
    }

    try {
      await API.post(`/doctor/trips/${this.tripId}/complete`);
      await this.stopTracking();
      return { success: true };
    } catch (error: any) {
      console.error('Error completing trip:', error?.response?.data || error);
      return {
        success: false,
        error: error?.response?.data?.message || 'Failed to complete trip.',
      };
    }
  }

  /**
   * Stop any ongoing tracking.
   */
  async stopTracking() {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.isTracking = false;
    this.tripId = null;
    this.sessionId = null;
    this.currentStatus = 'started';
    this.statusListener = undefined;
    this.locationListener = undefined;
    this.lastUpdateTimestamp = 0;
    this.retryCount = 0;

    await this.clearPersistedTrip();
  }

  /**
   * Determine if tracker is currently active.
   */
  isCurrentlyTracking(): boolean {
    return this.isTracking && !!this.tripId;
  }

  getCurrentStatus(): TripStatus {
    return this.currentStatus;
  }

  setCurrentStatus(status: TripStatus) {
    this.currentStatus = status;
  }

  /**
   * Return previously stored trip metadata (used by bootstrapping flows).
   */
  async getPersistedTripMeta(): Promise<{ tripId: number; sessionId: number } | null> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_TRIP_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.tripId && parsed?.sessionId) {
        return { tripId: parsed.tripId, sessionId: parsed.sessionId };
      }
      return null;
    } catch (error) {
      console.warn('Failed to read persisted trip meta:', error);
      return null;
    }
  }

  /**
   * Ensure permissions are granted before starting/resuming tracking.
   */
  private async ensurePermissions(promptOnDeny: boolean): Promise<boolean> {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted' && promptOnDeny) {
      const request = await Location.requestForegroundPermissionsAsync();
      status = request.status;
    }

    if (status !== 'granted') {
      return false;
    }

    if (Platform.OS === 'ios') {
      let bgStatus = (await Location.getBackgroundPermissionsAsync()).status;
      if (bgStatus !== 'granted' && promptOnDeny) {
        bgStatus = (await Location.requestBackgroundPermissionsAsync()).status;
      }
      if (bgStatus !== 'granted') {
        console.warn('Background location permission not granted. Tracking will pause when app is backgrounded.');
      }
    }

    return true;
  }

  /**
   * Begin foreground listener + periodic polling.
   */
  private async beginTrackingLoop() {
    await this.startLocationWatcher();

    if (!this.intervalId) {
      this.intervalId = setInterval(async () => {
        if (!this.isTracking) return;
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await this.handleLocationUpdate(location);
        } catch (error) {
          console.warn('Periodic location fetch failed:', error);
        }
      }, 15000);
    }

    if (!this.appStateSubscription) {
      this.appStateSubscription = AppState.addEventListener('change', (state) => {
        if (state === 'active' && this.isTracking && !this.locationSubscription) {
          this.startLocationWatcher();
        }
      });
    }
  }

  /**
   * Start high-accuracy watcher.
   */
  private async startLocationWatcher() {
    if (this.locationSubscription || !this.isTracking) return;

    try {
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (location) => {
          await this.handleLocationUpdate(location);
        }
      );
    } catch (error) {
      console.error('Failed to start location watcher:', error);
    }
  }

  /**
   * Send latest coordinates to backend.
   */
  private async handleLocationUpdate(location: Location.LocationObject) {
    if (!this.tripId || !this.isTracking) return;

    const now = Date.now();
    if (now - this.lastUpdateTimestamp < this.minUpdateInterval) {
      return;
    }

    try {
      const response = await API.post('/doctor/trips/update-location', {
        trip_id: this.tripId,
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy ?? null,
        speed: location.coords.speed ?? null,
        heading: location.coords.heading ?? null,
      });

      this.lastUpdateTimestamp = now;
      this.retryCount = 0;

      if (response.data?.trip) {
        const updatedStatus: TripStatus = response.data.trip.status || this.currentStatus;
        if (updatedStatus !== this.currentStatus) {
          this.currentStatus = updatedStatus;
          if (this.statusListener) {
            this.statusListener(updatedStatus);
          }
        }
      }

      if (this.locationListener) {
        this.locationListener(location);
      }
    } catch (error: any) {
      console.error('Location update failed:', error?.response?.data || error);

      if (error?.response?.status === 401) {
        await this.stopTracking();
        return;
      }

      if (!error?.response) {
        this.retryCount += 1;
        if (this.retryCount <= this.maxRetries) {
          const delay = Math.min(Math.pow(2, this.retryCount) * 1000, 15000);
          setTimeout(() => {
            if (this.isTracking) {
              this.handleLocationUpdate(location);
            }
          }, delay);
        } else {
          this.retryCount = 0;
        }
      }
    }
  }

  private async persistActiveTrip() {
    if (!this.tripId || !this.sessionId) return;
    try {
      await AsyncStorage.setItem(
        ACTIVE_TRIP_STORAGE_KEY,
        JSON.stringify({ tripId: this.tripId, sessionId: this.sessionId })
      );
    } catch (error) {
      console.warn('Failed to persist active trip meta:', error);
    }
  }

  private async clearPersistedTrip() {
    try {
      await AsyncStorage.removeItem(ACTIVE_TRIP_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear trip meta:', error);
    }
  }
}

export const locationTracker = new LocationTracker();
















