import { Tabs, router, useFocusEffect } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Home, Briefcase, User, Settings } from 'lucide-react-native';
import { isDoctorLoggedIn } from '@/utils/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

  // Also check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const isLoggedIn = await isDoctorLoggedIn();
      if (!isLoggedIn) {
        console.log('⚠️ Doctor not authenticated on mount, redirecting to login...');
        router.replace('/login');
      }
    };
    checkAuth();
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
            ? 90 + Math.max(insets.bottom - 20, 0) 
            : 75 + Math.max(insets.bottom - 12, 0),
          paddingBottom: Platform.OS === 'web' 
            ? 8 
            : Platform.OS === 'ios'
            ? Math.max(insets.bottom, 20)
            : Math.max(insets.bottom, 12),
          paddingTop: Platform.OS === 'web' ? 8 : 12,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          position: Platform.OS === 'web' ? 'relative' : 'absolute',
        },
        tabBarActiveTintColor: '#0066FF',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
          letterSpacing: 0.2,
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
          title: 'Job Sessions',
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
        name="more"
        options={{
          title: 'Settings',
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
              <Settings size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
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
        name="check-in"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="job-detail"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="job-session"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
