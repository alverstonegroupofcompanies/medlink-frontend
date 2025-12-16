# WebSocket (Pusher) Frontend Environment Variables Setup

## Frontend `.env` Configuration

Add the following variables to your `frontend/.env` file:

```env
# Pusher Configuration (must start with EXPO_PUBLIC_ to be accessible)
EXPO_PUBLIC_PUSHER_KEY=your-app-key
EXPO_PUBLIC_PUSHER_CLUSTER=your-cluster

# Optional: For self-hosted Pusher or custom configuration
# EXPO_PUBLIC_PUSHER_HOST=your-pusher-host
# EXPO_PUBLIC_PUSHER_PORT=443
# EXPO_PUBLIC_PUSHER_FORCE_TLS=true
```

## Important Notes

1. **EXPO_PUBLIC_ Prefix**: All environment variables must start with `EXPO_PUBLIC_` to be accessible in the React Native app
2. **Matching Values**: 
   - `EXPO_PUBLIC_PUSHER_KEY` should match `PUSHER_APP_KEY` from backend `.env`
   - `EXPO_PUBLIC_PUSHER_CLUSTER` should match `PUSHER_APP_CLUSTER` from backend `.env`

## Getting Pusher Credentials

1. Sign up at [Pusher.com](https://pusher.com)
2. Create a new app/channel
3. Go to "App Keys" tab
4. Copy:
   - Key → `EXPO_PUBLIC_PUSHER_KEY`
   - Cluster → `EXPO_PUBLIC_PUSHER_CLUSTER`

## After Updating .env

1. Restart the Expo development server:
   ```bash
   npm start
   # or
   expo start
   ```

2. Clear cache if needed:
   ```bash
   expo start -c
   ```

## Usage in Code

The environment variables are automatically exposed via `expo-constants` in `app.config.js` and can be accessed in your React Native code as shown in `app/hospital/live-tracking.tsx`.

