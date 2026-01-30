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
          if (__DEV__) {
            console.log('⚠️ Doctor not authenticated, redirecting to login...');
          }
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
        if (__DEV__) {
          console.log('⚠️ Doctor not authenticated on mount, redirecting to login...');
        }
        router.replace('/login');
        return;
      }

      // Setup Real-time Listeners
      const doctor = await getDoctorInfo();
      if (doctor?.id) {
          doctorId = doctor.id;
          channelName = `App.Models.User.${doctor.id}`;
          if (__DEV__) {
            console.log(`🔌 [Global] Subscribing to private channel: ${channelName}`);
            console.log(`🔌 [Global] Echo connection state:`, echo.connector?.socket?.readyState);
          }
          
          // Subscribe to private channel and set up listeners
          echo.private(channelName)
              .listen('.ApplicationStatusUpdated', (e: any) => {
                  if (__DEV__) {
                    console.log('🔔 [Global] ApplicationStatusUpdated received:', e);
                    console.log('🔔 [Global] Event data:', JSON.stringify(e, null, 2));
                  }
                  
                  // Show system notification
                  showNotificationFromData({
                      title: 'Application Update',
                      message: e.message || 'Your application status has been updated',
                      type: e.data?.type || 'info',
                      data: e.data || {}
                  });

                  // Emit specific event with application update data for immediate UI update
                  // Handle both direct properties and nested data structure
                  const eventData = {
                      applicationId: e.data?.job_application_id || e.job_application_id,
                      requirementId: e.data?.job_requirement_id || e.job_requirement_id,
                      status: e.status,
                      data: e.data || {}
                  };
                  
                  if (eventData.status) {
                      DeviceEventEmitter.emit('APPLICATION_STATUS_UPDATED', eventData);
                      console.log('✅ [Global] Emitted APPLICATION_STATUS_UPDATED event:', eventData);
                  }

                  // Trigger global refresh to ensure UI is updated
                  DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
              })
              .listen('.NewJobPosted', (e: any) => {
                  if (__DEV__) {
                    console.log('🔔 [Global] NewJobPosted received:', e);
                    console.log('🔔 [Global] Event structure:', JSON.stringify(e, null, 2));
                  }
                  
                  // Extract job requirement - handle different event structures
                  // The event should have jobRequirement in the broadcastWith() data
                  const jobRequirement = e.jobRequirement || e.job_requirement || e.data?.jobRequirement || e;
                  
                  if (!jobRequirement || !jobRequirement.id) {
                      console.warn('⚠️ [Global] Invalid job requirement in event:', e);
                      // Still trigger refresh in case the job was posted
                      DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
                      return;
                  }
                  
                  // Extract hospital info for notification
                  const hospital = jobRequirement.hospital || e.hospital || e.data?.hospital;
                  const hospitalName = hospital?.name || 'A hospital';
                  const departmentName = typeof jobRequirement.department === 'string' 
                      ? jobRequirement.department 
                      : (jobRequirement.department?.name || jobRequirement.department?.department || 'a department');
                  
                  // Show system notification with proper data
                  console.log('📬 [Global] Attempting to show notification for new job posting');
                  showNotificationFromData({
                      title: 'New Job Opportunity',
                      message: e.message || `New ${departmentName} position available at ${hospitalName}`,
                      type: 'new_job_posting',
                      user_type: 'doctor',
                      data: { 
                          type: 'new_job_posting', 
                          job_requirement_id: jobRequirement.id,
                          ...jobRequirement 
                      },
                      sender: hospital,
                      sender_type: 'hospital'
                  }).catch((error) => {
                      console.error('❌ [Global] Error showing notification:', error);
                  });

                  // Emit specific event with job data for immediate UI update
                  // Pass the full jobRequirement object with all nested data
                  const jobData = {
                      ...jobRequirement,
                      hospital: hospital || jobRequirement.hospital,
                      message: e.message,
                      department: departmentName, // Ensure department is a string
                  };
                  
                  DeviceEventEmitter.emit('NEW_JOB_POSTED', jobData);
                  console.log('✅ [Global] Emitted NEW_JOB_POSTED event:', jobData.id);

                  // Trigger global refresh as fallback to ensure UI is updated
                  DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
              })
              .listen('.JobSessionCreated', (e: any) => {
                  if (__DEV__) {
                    console.log('🔔 [Global] Job Session Created received:', e);
                  }
                  
                  // Show system notification
                  showNotificationFromData({
                      title: 'Job Session Scheduled',
                      message: e.message || 'A new job session has been scheduled for you',
                      type: 'job_session_created',
                      data: e.data || e.jobSession
                  });

                  // Emit specific event for immediate UI update
                  DeviceEventEmitter.emit('JOB_SESSION_CREATED', {
                      jobSession: e.jobSession || e.data,
                      data: e.data
                  });

                  // Trigger global refresh
                  DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
              })
              .listen('.PaymentHeld', (e: any) => {
                  if (__DEV__) {
                    console.log('🔔 [Global] Payment Held received:', e);
                  }
                  
                  // Show system notification
                  showNotificationFromData({
                      title: 'Payment Held in Escrow',
                      message: e.message || `Payment of ₹${e.amount} has been held in escrow`,
                      type: 'payment_held',
                      data: e.data
                  });

                  // Emit specific event for immediate UI update (wallet refresh)
                  DeviceEventEmitter.emit('PAYMENT_HELD', {
                      paymentId: e.paymentId,
                      amount: e.amount,
                      data: e.data
                  });

                  // Trigger global refresh (including wallet)
                  DeviceEventEmitter.emit('REFRESH_DOCTOR_DATA');
              });
      }
    };
    
    setup();

    return () => {
        if (channelName) {
            if (__DEV__) {
              console.log(`🔌 [Global] Unsubscribing from channel: ${channelName}`);
            }
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
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
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
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
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
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              }}
            >
              <Briefcase size={24} color={color} fill={focused ? color : 'transparent'} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="disputes"
        options={{
          title: 'Disputes',
          tabBarIcon: ({ color, focused }) => {
            // We'll need to get disputes count from context or props
            // For now, just show the icon
            return (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  position: 'relative',
                }}
              >
                <MaterialIcons name="gavel" size={24} color={color} />
              </View>
            );
          },
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
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              }}
            >
              <MaterialIcons name="account-balance-wallet" size={24} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
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
                backgroundColor: focused ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
              }}
            >
              <MaterialIcons name="settings" size={24} color={color} />
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
      <Tabs.Screen name="dispute" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="dispute/[sessionId]" options={{ href: null }} />
      <Tabs.Screen name="dispute/detail/[disputeId]" options={{ href: null }} />
    </Tabs>
  );
}
