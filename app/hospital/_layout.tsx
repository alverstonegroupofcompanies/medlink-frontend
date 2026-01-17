import { Tabs, router, useFocusEffect } from 'expo-router';
import * as React from 'react';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { Home, Calendar, Bell, MapPin, User, CreditCard } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HOSPITAL_TOKEN_KEY = 'hospitalToken';

export default function HospitalTabLayout() {
  const insets = useSafeAreaInsets();
  
  // Check authentication when tabs are focused
  useFocusEffect(
    React.useCallback(() => {
      const checkAuth = async () => {
        try {
          const token = await AsyncStorage.getItem(HOSPITAL_TOKEN_KEY);
          if (!token) {
            console.log('⚠️ Hospital not authenticated, redirecting to login...');
            router.replace('/hospital/login');
          }
        } catch (error) {
          console.error('Error checking auth:', error);
          router.replace('/hospital/login');
        }
      };
      checkAuth();
    }, [])
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          height: Platform.OS === 'ios' ? 85 + Math.max(insets.bottom - 20, 0) : 70 + Math.max(insets.bottom - 12, 0),
          paddingBottom: Platform.OS === 'ios'
            ? Math.max(insets.bottom, 20)
            : Math.max(insets.bottom, 12),
          paddingTop: 8,
          paddingHorizontal: 8,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarActiveTintColor: '#2563EB',
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
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(123, 97, 255, 0.1)' : 'transparent',
              }}
            >
              <Home size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="live-tracking"
        options={{
          title: 'Tracking',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(123, 97, 255, 0.1)' : 'transparent',
              }}
            >
              <MapPin size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          tabBarIcon: ({ color, focused }) => (
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: focused ? 'rgba(123, 97, 255, 0.1)' : 'transparent',
              }}
            >
              <CreditCard size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
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
                backgroundColor: focused ? 'rgba(123, 97, 255, 0.1)' : 'transparent',
              }}
            >
              <User size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      {/* Hidden routes - not shown in tab bar */}
      <Tabs.Screen
        name="login"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="applications"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="doctor-profile"
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
      <Tabs.Screen
        name="sessions"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="review-session"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{
          href: null,
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
