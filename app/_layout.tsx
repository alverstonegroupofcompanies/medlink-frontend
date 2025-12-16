import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
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
    let timeoutId: NodeJS.Timeout;
    
    async function prepare() {
      try {
        // Set a timeout to proceed even if fonts don't load
        timeoutId = setTimeout(() => {
          console.warn('Font loading timeout - proceeding with system fonts');
          setAppIsReady(true);
          SplashScreen.hideAsync();
        }, 8000); // 8 second timeout

        // Wait for fonts to load or error
        if (fontsLoaded || fontError) {
          clearTimeout(timeoutId);
          setupNotificationListeners();
          setAppIsReady(true);
          await SplashScreen.hideAsync();
        }
      } catch (e) {
        console.warn('Error during app preparation:', e);
        clearTimeout(timeoutId);
        setAppIsReady(true);
        await SplashScreen.hideAsync();
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
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </PaperProvider>
    </TamaguiProvider>
  );
}
