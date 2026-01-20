import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { TamaguiProvider } from '@tamagui/core';
import config from '@/tamagui.config';
import { useFonts } from 'expo-font';
import { PaperProvider } from 'react-native-paper';
import { doctorPaperTheme } from '@/theme/paperThemes';
import {
  Jost_400Regular,
  Jost_500Medium,
  Jost_600SemiBold,
  Jost_700Bold,
} from '@expo-google-fonts/jost';
import {
  Roboto_400Regular,
  Roboto_500Medium,
} from '@expo-google-fonts/roboto';

import { AppSplashScreen } from '@/components/splash-screen';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setupNotificationListeners } from '@/utils/notifications';
import { setupErrorHandlers } from '@/utils/error-logger';

// Keep the native splash screen visible while we load
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Initial route will be handled by index.tsx
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);

  // Load fonts
  const [fontsLoaded, fontError] = useFonts({
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
    Jost_700Bold,
    Roboto_400Regular,
    Roboto_500Medium,
  });

  useEffect(() => {
    // Set default blue status bar for all pages
    StatusBar.setBarStyle('light-content', true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#2563EB', true);
      StatusBar.setTranslucent(false);
    }
    
    let timeoutId: any;
    
    // Setup error handlers
    setupErrorHandlers();
    
    async function prepare() {
      try {
        // Wait for fonts to load
        if (fontsLoaded || fontError) {
          // Hide native splash screen immediately to show our custom animated splash
          await SplashScreen.hideAsync();
          
          // Show custom splash for a fixed duration (8 seconds) for the animation to play
          const customSplashDuration = 8000;
          await new Promise(resolve => setTimeout(resolve, customSplashDuration));
          
          setAppIsReady(true);
        }
      } catch (e) {
        console.warn('Error during app preparation:', e);
        // Ensure we at least show the app if something fails
        await SplashScreen.hideAsync();
        setAppIsReady(true);
      }
    }

    prepare();
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fontsLoaded, fontError]);

  if (!appIsReady) {
    return <AppSplashScreen />;
  }

  return (
    <TamaguiProvider config={config} defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}>
      <PaperProvider theme={doctorPaperTheme}>
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            {/* 👇 Hide headers for all screens */}
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            {/* Global default blue status bar - applies to all pages */}
            <ExpoStatusBar style="light" backgroundColor="#2563EB" />
            {Platform.OS === 'android' && (
              <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />
            )}
          </ThemeProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </TamaguiProvider>
  );
}
