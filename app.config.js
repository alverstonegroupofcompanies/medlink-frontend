// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: "Alverconnect",
    slug: "AlverstoneMedLink",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "alverstonemedlink",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.alverstones.medlink"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      package: "com.alverstones.medlink",
      versionCode: 11,
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      ["expo-build-properties", {
        ios: {
          useFrameworks: "static"
        },
        android: {
          // Network Security Configuration
          // Allow cleartext (HTTP) traffic for development
          // HTTPS traffic is allowed by default on Android
          // For production HTTPS, ensure server has valid SSL certificate
          usesCleartextTraffic: true,
          // Note: Android 9+ requires proper SSL certificate validation for HTTPS
          // If POST requests with FormData fail over HTTPS, check:
          // 1. Server SSL certificate is valid and not expired
          // 2. Certificate chain is complete (includes intermediate certificates)
          // 3. Certificate matches the server hostname
        }
      }],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow $(PRODUCT_NAME) to use your location."
        }
      ],
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-logo.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#2563EB",
          defaultChannel: "default"
        }
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // Expose environment variables to the app via expo-constants
      // 
      // IMPORTANT: Environment Variable Loading Priority
      // 1. EAS env variables (available as process.env during EAS builds)
      //    - Set via: eas env:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value https://...
      //    - Only works in EAS builds (production/preview), NOT in Expo Go
      // 2. .env file (via dotenv - for Expo Go and local development)
      //    - Create .env file in frontend/ directory
      //    - Copy .env.example to .env and fill in your values
      //    - Required for Expo Go to work
      // 3. Direct process.env (fallback)
      //
      // For Expo Go: You MUST create a .env file (EAS env variables won't work)
      // For EAS builds: EAS env variables are automatically injected as process.env
      
      // Backend URL - CRITICAL
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
      
      // Optional: API Host and Port (used if BACKEND_URL is not set)
      EXPO_PUBLIC_API_HOST: process.env.EXPO_PUBLIC_API_HOST,
      EXPO_PUBLIC_API_PORT: process.env.EXPO_PUBLIC_API_PORT,
      
      // Environment
      APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      
      // EAS project ID
      eas: {
        projectId: "f054b741-c4cc-496b-b8c0-bcf5103ce78b"
      }
    }
  }
};

