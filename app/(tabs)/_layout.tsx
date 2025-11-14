import { Tabs, router, useFocusEffect } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { Home, Calendar, User, Grid } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { isDoctorLoggedIn } from '@/utils/auth';

export default function TabLayout() {
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
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: PrimaryColors.main,
        tabBarInactiveTintColor: NeutralColors.textTertiary,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.tabIconContainer,
              focused && { backgroundColor: `${PrimaryColors.main}15` }
            ]}>
              <Home size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Calender',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.tabIconContainer,
              focused && { backgroundColor: `${PrimaryColors.main}15` }
            ]}>
              <Calendar size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.tabIconContainer,
              focused && { backgroundColor: `${PrimaryColors.main}15` }
            ]}>
              <User size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Logout',
          tabBarIcon: ({ color, focused }) => (
            <View style={[
              styles.tabIconContainer,
              focused && { backgroundColor: `${PrimaryColors.main}15` }
            ]}>
              <Grid size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    height: Platform.OS === 'ios' ? 90 : 75,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingTop: 12,
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
  },
});
