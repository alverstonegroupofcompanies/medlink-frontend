import { useEffect } from "react";
import { router } from "expo-router";
import { LogBox, Platform, View, ActivityIndicator } from "react-native";
import { isDoctorLoggedIn, isHospitalLoggedIn } from "@/utils/auth";
import { DoctorPrimaryColors } from "@/constants/doctor-theme";

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
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      console.log('🔍 Checking login status...');
      
      // Check Doctor Login
      const doctorLoggedIn = await isDoctorLoggedIn();
      if (doctorLoggedIn) {
        console.log('✅ Doctor logged in, redirecting to dashboard...');
        setTimeout(() => router.replace("/(tabs)"), 100);
        return;
      }

      // Check Hospital Login
      const hospitalLoggedIn = await isHospitalLoggedIn();
      if (hospitalLoggedIn) {
        console.log('✅ Hospital logged in, redirecting to hospital dashboard...');
        setTimeout(() => router.replace("/hospital/dashboard"), 100);
        return;
      }

      console.log('👤 No session found, redirecting to login...');
      router.replace("/login");

    } catch (error) {
      console.error('❌ Error checking login status:', error);
      // Fallback to login on error
      router.replace("/login");
    }
  };

  return (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'}}>
        <ActivityIndicator size="large" color={DoctorPrimaryColors.primary} />
    </View>
  );
}
