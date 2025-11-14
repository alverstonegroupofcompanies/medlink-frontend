import { useEffect } from "react";
import { router } from "expo-router";
import { LogBox, Platform } from "react-native";

// Ignore React Native warning in mobile
if (Platform.OS !== "web") {
  LogBox.ignoreLogs(["props.pointerEvents is deprecated. Use style.pointerEvents"]);
} else {
  // Ignore same warning in web
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("props.pointerEvents")) return;
    originalWarn(...args);
  };
}

export default function Index() {
  useEffect(() => {
    console.log('🏠 Index page loaded');
    // Redirect to login page when app starts
    console.log('🔄 Redirecting to /login...');
    try {
      router.replace("/login");
      console.log('✅ Redirect to /login completed');
    } catch (error) {
      console.error('❌ Error redirecting to /login:', error);
      console.error('❌ Redirect error details:', JSON.stringify(error, null, 2));
    }
  }, []);

  return null;
}
