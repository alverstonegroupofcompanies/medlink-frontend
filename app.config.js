// Load environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: "AlverstoneMedLink",
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
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
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
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000"
          }
        }
      ],
      "expo-build-properties"
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true
    },
    extra: {
      // Expose environment variables to the app via expo-constants
      EXPO_PUBLIC_API_HOST: process.env.EXPO_PUBLIC_API_HOST,
      EXPO_PUBLIC_API_PORT: process.env.EXPO_PUBLIC_API_PORT,
      EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
      APP_ENV: process.env.APP_ENV || 'development',
    }
  }
};

