import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API from '@/app/api';

export const LIVE_LOCATION_TASK = 'LIVE_LOCATION_TASK';
export const LIVE_LOCATION_SESSION_KEY = 'liveLocationSessionId';
export const LIVE_LOCATION_ENABLED_KEY = 'liveLocationEnabled';

type StoredSession = { sessionId: number };

async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const raw = await AsyncStorage.getItem(LIVE_LOCATION_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.sessionId === 'number') return parsed;
    return null;
  } catch {
    return null;
  }
}

// Must be defined in module scope.
TaskManager.defineTask(LIVE_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }

  const session = await getStoredSession();
  if (!session?.sessionId) {
    // No active session → stop the task to avoid battery drain.
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(LIVE_LOCATION_TASK);
      if (started) {
        await Location.stopLocationUpdatesAsync(LIVE_LOCATION_TASK);
      }
    } catch {
      // ignore
    }
    return;
  }

  const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
  const latest = locations?.[0];
  if (!latest) return;

  try {
    await API.post('/doctor/update-location', {
      latitude: latest.coords.latitude,
      longitude: latest.coords.longitude,
      job_session_id: session.sessionId,
    });
  } catch {
    // keep quiet to avoid noisy background logs; next tick will retry
  }
});

