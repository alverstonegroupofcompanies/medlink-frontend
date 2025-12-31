import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { Alert, Platform } from 'react-native';
import API from '../app/api'; // Adjust based on your API import path
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const LOCATION_UPDATE_INTERVAL = 3000; // 3 seconds
const DISTANCE_FILTER = 5; // 5 meters

export const useLocationTracking = () => {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [isTracking, setIsTracking] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const subscriberRef = useRef<Location.LocationSubscription | null>(null);
    const lastUpdateRef = useRef<number>(0);
    const sessionIdRef = useRef<number | undefined>(undefined);

    const startTracking = async (sessionId?: number) => {
        if (sessionId) sessionIdRef.current = sessionId;

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Permission to access location was denied');
                Alert.alert('Permission needed', 'Location permission is required for live tracking.');
                return;
            }

            // Optional: Request background permissions if needed
            // const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();

            setIsTracking(true);

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
            setErrorMsg(err.message);
            setIsTracking(false);
        }
    };

    const stopTracking = async () => {
        if (subscriberRef.current) {
            await subscriberRef.current.remove();
            subscriberRef.current = null;
        }
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

    return { location, isTracking, startTracking, stopTracking, errorMsg };
};
