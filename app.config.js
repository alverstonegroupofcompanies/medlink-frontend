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
      bundleIdentifier: "com.alverstonemedlink.app"
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png"
      },
      package: "com.alverstonemedlink.app",
      versionCode: 5,
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
          // Allow cleartext (HTTP) traffic for development
          usesCleartextTraffic: true
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
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // Expose environment variables to the app via expo-constants
      // In production builds, EAS secrets are automatically injected as process.env
      // In development, these come from .env file via dotenv
      EXPO_PUBLIC_API_HOST: process.env.EXPO_PUBLIC_API_HOST,
      EXPO_PUBLIC_API_PORT: process.env.EXPO_PUBLIC_API_PORT,
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
      APP_ENV: process.env.APP_ENV || process.env.NODE_ENV || 'development',
      eas: {
        projectId: "f054b741-c4cc-496b-b8c0-bcf5103ce78b"
      }
    }
  }
};

