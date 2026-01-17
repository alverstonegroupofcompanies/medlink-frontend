import { Tabs, router, useFocusEffect } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Home, Briefcase, User } from 'lucide-react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { isDoctorLoggedIn, getDoctorInfo } from '@/utils/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import echo from "@/services/echo";
import { DeviceEventEmitter } from 'react-native';
import { showNotificationFromData } from "@/utils/notifications";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  
  // Check authentication when tabs are focused
  useFocusEffect(
    React.useCallback(() => {
      const checkAuth = async () => {
        const isLoggedIn = await isDoctorLoggedIn();
        if (!isLoggedIn) {
          console.log('⚠️ Doctor not authenticated, redirecting to login...');
          router.replace('/login');
        }
      };
      checkAuth();
    }, [])
  );

  // Check authentication on mount and setup real-time listeners
  useEffect(() => {
    let doctorId: number | null = null;
    let channelName: string | null = null;

    const setup = async () => {
      const isLoggedIn = await isDoctorLoggedIn();
      if (!isLoggedIn) {
        console.log('⚠️ Doctor not authenticated on mount, redirecting to login...');
        router.replace('/login');
        return;
      }

      // Setup Real-time Listeners
      const doctor = await getDoctorInfo();
      if (doctor?.id) {
          doctorId = doctor.id;
          channelName = `App.Models.User.${doctor.id}`;
          console.log(`🔌 [Global] Subscribing to private channel: ${channelName}`);
          
          echo.private(channelName)
              .listen('.ApplicationStatusUpdated', (e: any) => {
                  console.log('🔔 [Global] Real-time update received:', e);
                  
                  // Show system notification
                  showNotificationFromData({
                      title: 'Application Update',
                      message: e.message,
                      type: e.data?.type || 'info',
                      data: e.data
                  });

                  // Trigger global refresh
                  DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
              })
              .listen('.NewJobPosted', (e: any) => {
                  console.log('🔔 [Global] New Job Posting received:', e);
                  
                  // Show system notification
                  showNotificationFromData({
                      title: 'New Job Opportunity',
                      message: e.message,
                      type: 'info',
                      data: { type: 'new_job_posting', ...e.jobRequirement }
                  });

                  // Trigger global refresh
                  DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
              });
      }
    };
    
    setup();

    return () => {
        if (channelName) {
            console.log(`🔌 [Global] Unsubscribing from channel: ${channelName}`);
            echo.leave(channelName);
        }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          height: Platform.OS === 'web' 
            ? 70 
            : Platform.OS === 'ios' 
            ? 85 + Math.max(insets.bottom - 20, 0) 
            : 70 + Math.max(insets.bottom - 12, 0),
          paddingBottom: Platform.OS === 'web' 
            ? 8 
            : Platform.OS === 'ios'
            ? Math.max(insets.bottom, 20)
            : Math.max(insets.bottom, 12),
          paddingTop: 8,
          paddingHorizontal: 8,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          zIndex: 100,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: '#0066FF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.2,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
              }}
            >
              <Home size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
              }}
            >
              <User size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
              }}
            >
              <Briefcase size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wallet"
        options={{
          title: 'Wallet',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(0, 102, 255, 0.1)' : 'transparent',
              }}
            >
              <MaterialIcons name="account-balance-wallet" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      {/* Hidden routes - not shown in tab bar - using href: null to prevent tab bar display */}
      <Tabs.Screen
        name="approved-applications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="active-jobs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="upcoming-jobs"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="job-detail"
        options={{
          href: null,
          tabBarStyle: { display: 'flex' } // Explicitly ensure it shows
        }}
      />
      <Tabs.Screen
        name="dispute"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
