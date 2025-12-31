import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Allow Pusher to be used by Echo
// @ts-ignore
window.Pusher = Pusher;

// Configuration from Environment Variables
const REVERB_HOST = process.env.EXPO_PUBLIC_REVERB_HOST || '192.168.1.5';
const REVERB_PORT = parseInt(process.env.EXPO_PUBLIC_REVERB_PORT || '8080');
const REVERB_APP_KEY = process.env.EXPO_PUBLIC_REVERB_APP_KEY || 'your_app_key';
const REVERB_SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME || 'http';

// Construct auth endpoint dynamically
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const AUTH_ENDPOINT = BACKEND_URL
    ? `${BACKEND_URL}/api/broadcasting/auth`
    : `http://${REVERB_HOST}:8000/api/broadcasting/auth`;

console.log('Echo Config:', { REVERB_HOST, REVERB_PORT, REVERB_SCHEME });

const echo = new Echo({
    broadcaster: 'reverb',
    key: REVERB_APP_KEY,
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    // Custom authorizer for Sanctum
    authorizer: (channel: any, options: any) => {
        return {
            authorize: async (socketId: any, callback: any) => {
                try {
                    // Try to get token from storage
                    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('hospitalToken');

                    const response = await fetch(AUTH_ENDPOINT, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            socket_id: socketId,
                            channel_name: channel.name
                        })
                    });

                    // Parse response safely
                    const text = await response.text();
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        console.error('Echo Auth Parse Error:', text);
                        callback(true, { message: 'Invalid JSON response' });
                        return;
                    }

                    if (response.ok) {
                        callback(false, data);
                    } else {
                        callback(true, data);
                    }
                } catch (error) {
                    console.error('Echo Auth Error:', error);
                    callback(true, error);
                }
            }
        };
    },
});

export default echo;
