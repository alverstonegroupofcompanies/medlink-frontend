import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  MapPin, 
  Clock, 
  CheckCircle, 
  Building2, 
  Navigation, 
  ArrowLeft, 
  DollarSign,
  Share2,
  Calendar,
  AlertTriangle,
  Check,
  Star
} from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorStatusColors as StatusColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import { ModernColors } from '@/constants/modern-theme';
import API from '../../api';
import * as Location from 'expo-location';
import { CheckInMapView } from '@/components/CheckInMapView';
import { StopwatchTimer } from '@/components/StopwatchTimer';

const { width } = Dimensions.get('window');

export default function JobDetailScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [address, setAddress] = useState<string>('Loading address...');

  useFocusEffect(
    React.useCallback(() => {
      loadApplication();
      getCurrentLocation();
      
      // If application is selected but no session, reload after a short delay
      if (application?.status === 'selected' && !application?.job_session?.id) {
        const timer = setTimeout(() => {
          console.log('Reloading application to find session...');
          loadApplication();
        }, 2000);
        return () => clearTimeout(timer);
      }
    }, [applicationId, application?.status, application?.job_session?.id])
  );

  useEffect(() => {
    if (currentLocation && application?.job_requirement) {
      calculateDistance();
    }
  }, [currentLocation, application]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/doctor/applications/${applicationId}`);
      const app = response.data.application;
      setApplication(app);
      
      // Pre-fill address if available
      // Pre-fill address: Priority to job requirement custom address
      // If custom location exists but no text address, show placeholder instead of falling back to hospital default
      if (app?.job_requirement?.address) {
        setAddress(app.job_requirement.address);
      } else if (app?.job_requirement?.latitude && app?.job_requirement?.longitude) {
         setAddress("Custom Location (See Map)");
      } else if (app?.job_requirement?.hospital?.address) {
         setAddress(app.job_requirement.hospital.address);
      } else {
         setAddress('Location details not available');
      }

    } catch (error: any) {
      if (__DEV__) {
        console.error('Error loading application:', error);
      }
      const message = error?.userFriendlyMessage || error?.message || 'Unable to load job details. Please try again.';
      Alert.alert('Unable to Load', message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const loc = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setCurrentLocation(loc);

      // Send location to backend
      try {
        await API.post('/doctor/update-location', {
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      } catch (e) {
        console.log('Failed to update location on backend');
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const calculateDistance = () => {
    if (!currentLocation || !application?.job_requirement) return;

    const hospital = application.job_requirement.hospital;
    // Check job requirement specific location first, then fallback to hospital location
    const latRaw = application.job_requirement?.latitude || hospital?.latitude;
    const lngRaw = application.job_requirement?.longitude || hospital?.longitude;
    
    const lat = latRaw ? Number(latRaw) : null;
    const lng = lngRaw ? Number(lngRaw) : null;
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      setDistance(null);
      return;
    }

    const R = 6371; // Earth's radius in km
    const dLat = deg2rad(lat - currentLocation.latitude);
    const dLon = deg2rad(lng - currentLocation.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(currentLocation.latitude)) *
        Math.cos(deg2rad(lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    setDistance(distance);
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const handleStartTracking = async () => {
    console.log('handleStartTracking called');
     // This is "Share Live Location"
    let sessionId = application.job_session?.id;
    let currentApplication = application;
    console.log('Session ID:', sessionId);
    console.log('Application status:', application.status);
    
    // If no session but application is selected, try multiple approaches to find it
    if (!sessionId && application.status === 'selected') {
      console.log('Application is selected but no session found, attempting to locate session...');
      
      // Try 1: Reload application data (most reliable)
      try {
        const response = await API.get(`/doctor/applications/${applicationId}`);
        const updatedApp = response.data.application;
        currentApplication = updatedApp;
        sessionId = updatedApp?.job_session?.id;
        
        if (sessionId) {
          console.log('Session found after reload:', sessionId);
          setApplication(updatedApp);
        } else {
          // Try 2: Query sessions directly by job requirement
          console.log('Trying to find session via sessions API...');
          try {
            const sessionsResponse = await API.get('/doctor/sessions');
            const sessions = sessionsResponse.data.sessions || [];
            const matchingSession = sessions.find((s: any) => 
              s.job_requirement_id === application.job_requirement_id
            );
            
            if (matchingSession?.id) {
              console.log('Session found via sessions API:', matchingSession.id);
              sessionId = matchingSession.id;
              // Update application with session
              const updatedAppWithSession = {
                ...updatedApp,
                job_session: matchingSession
              };
              setApplication(updatedAppWithSession);
              currentApplication = updatedAppWithSession;
            } else {
              // Try 3: Wait and retry application reload
              console.log('Waiting and retrying application reload...');
              await new Promise(resolve => setTimeout(resolve, 2000));
              const retryResponse = await API.get(`/doctor/applications/${applicationId}`);
              const retryApp = retryResponse.data.application;
              currentApplication = retryApp;
              sessionId = retryApp?.job_session?.id;
              if (sessionId) {
                console.log('Session found after retry:', sessionId);
                setApplication(retryApp);
              }
            }
          } catch (sessionsError) {
            console.error('Error querying sessions:', sessionsError);
            // Final retry with delay
            await new Promise(resolve => setTimeout(resolve, 2000));
            const retryResponse = await API.get(`/doctor/applications/${applicationId}`);
            const retryApp = retryResponse.data.application;
            currentApplication = retryApp;
            sessionId = retryApp?.job_session?.id;
            if (sessionId) {
              setApplication(retryApp);
            }
          }
        }
      } catch (error) {
        console.error('Error reloading application:', error);
      }
    } else if (!sessionId) {
      // Try reload once even if not selected
      try {
        const response = await API.get(`/doctor/applications/${applicationId}`);
        const updatedApp = response.data.application;
        currentApplication = updatedApp;
        sessionId = updatedApp?.job_session?.id;
        if (sessionId) {
          setApplication(updatedApp);
        }
      } catch (error) {
        console.error('Error reloading application:', error);
      }
    }
    
    if (!sessionId) {
      if (application.status === 'selected') {
        Alert.alert(
          'Session Not Found', 
          'Your application has been approved, but we couldn\'t find the session. Please pull down to refresh the page, or contact support if the issue persists.',
          [
            { text: 'Refresh', onPress: () => loadApplication() },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else if (application.status === 'pending') {
        Alert.alert(
          'Application Pending', 
          'Your application is still pending hospital approval. Once approved, you will be able to share your live location.'
        );
      } else {
        Alert.alert(
          'No Active Session', 
          'No active session found for this job. Please wait for hospital approval or check back later.'
        );
      }
      return;
    }

    // Check tracking status from the current application state
    const isTracking = currentApplication?.job_session?.tracking_started_at || application.job_session?.tracking_started_at;
    if (isTracking) {
      Alert.alert('Already Tracking', 'Location tracking is already active.');
      // Reload to show updated status
      loadApplication();
      return;
    }

    try {
      // Check if permission is already granted
      const { status: currentStatus } = await Location.getForegroundPermissionsAsync();
      
      // Only request permission if not already granted
      let status = currentStatus;
      if (status !== 'granted') {
        // Check if GPS is enabled
        const locationEnabled = await Location.hasServicesEnabledAsync();
        if (!locationEnabled) {
          Alert.alert(
            'GPS Required',
            'Please enable GPS/Location Services in your device settings to share your live location.',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Open Settings', 
                onPress: () => {
                  if (Platform.OS === 'ios') {
                    Location.requestForegroundPermissionsAsync();
                  }
                }
              }
            ]
          );
          return;
        }
        
        // Request permission
        const { status: requestedStatus } = await Location.requestForegroundPermissionsAsync();
        status = requestedStatus;
      }
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required', 
          'Location permission is mandatory to share your live location with the hospital. Please enable it in your device settings.'
        );
        return;
      }

      setCheckingIn(true); 

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      const response = await API.post('/doctor/start-tracking', {
        job_session_id: sessionId,
        latitude,
        longitude,
      });

      // Reload application to get updated session data
      await loadApplication();

      Alert.alert(
        'Location Shared!',
        'You are now sharing your live location with the hospital.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Start tracking error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to start location tracking');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckIn = async () => {
    console.log('handleCheckIn called');
    if (!currentLocation) {
      Alert.alert('Location Required', 'Please enable location services to check in.');
      return;
    }
    
    // Allow check-in attempt for feedback even if far, but block api call
    if (distance && distance > 0.5) { // 0.5 km = 500m
        Alert.alert('Too Far to Check In', `You are ${distance < 1 ? Math.round(distance * 1000) + 'm' : distance.toFixed(2) + 'km'} away.\n\nYou must be within 500m of the hospital to check in.`);
        return;
    }

    let sessionId = application.job_session?.id;
    if (!sessionId) {
         // Try reload to be safe
         await loadApplication();
         sessionId = application?.job_session?.id;
         if(!sessionId) {
             Alert.alert('Error', 'Session not active yet. Please wait for hospital approval.');
             return;
         }
    }

    try {
      setCheckingIn(true);
      const response = await API.post('/doctor/check-in', {
        job_session_id: sessionId,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });

      if (response.data.check_in_verified) {
         loadApplication(); // Reload immediately to show timer
         Alert.alert('Success', 'Checked in successfully!');
      } else {
           Alert.alert('Check-In Failed', response.data.message || 'Could not verify location.');
      }

    } catch (error: any) {
        console.log('Check in error', error);
        Alert.alert('Error', error.response?.data?.message || 'Check-in failed');
    } finally {
        setCheckingIn(false);
    }
  };

  const handleFinishWork = async () => {
      try {
          const sessionId = application.job_session?.id;
          if (!sessionId) return;

          setLoading(true);
          const response = await API.post(`/doctor/sessions/${sessionId}/complete`);
          
          console.log('Finished work response:', JSON.stringify(response.data, null, 2));

          // Update local state immediately with the returned session
          if (response.data.session) {
             console.log('Updating local session with:', response.data.session);
             setApplication(prev => ({
                 ...prev,
                 job_session: response.data.session
             }));
             // Force reload in background to be safe
             loadApplication();
          } else {
             console.log('No session in response, reloading...');
             // Fallback reload if no session returned
             await loadApplication();
          }
          
          Alert.alert("Success", "Work completed successfully! Waiting for hospital review.");
      } catch (error: any) {
          console.error("Finish work error:", error);
          Alert.alert("Error", error.response?.data?.message || "Failed to complete work");
      } finally {
          setLoading(false);
      }
  };
  
  const openMaps = () => {
      const hospital = application?.job_requirement?.hospital;
      // Prioritize job location over hospital default
      const lat = application?.job_requirement?.latitude || hospital?.latitude;
      const lng = application?.job_requirement?.longitude || hospital?.longitude;
      const label = encodeURIComponent(hospital?.name || "Hospital");

      if (lat && lng) {
          const url = Platform.select({
              ios: `maps:0,0?q=${label}@${lat},${lng}`,
              android: `geo:0,0?q=${lat},${lng}(${label})`
          });
          if(url) Linking.openURL(url);
      } else {
          // Fallback to address query
          const query = encodeURIComponent(address);
          const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
          Linking.openURL(url);
      }
  };


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ModernColors.primary.main} />
      </View>
    );
  }

  if (!application) return null;

  const hospital = application.job_requirement?.hospital;
  const session = application.job_session;
  const isCheckedIn = !!session?.check_in_time;
  const isSharingLive = !!session?.tracking_started_at;
  
  // Parse time
  const startTime = application.job_requirement?.start_time || "09:00:00";
  const endTime = application.job_requirement?.end_time || "17:00:00";
  const formattedTime = `${startTime.substring(0,5)} - ${endTime.substring(0,5)}`;
  
  const workDate = new Date(application.job_requirement?.work_required_date || Date.now());
  const formattedDate = workDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  // Map Data
  // Map Data: Priority to job specific location
  const hospitalLat = Number(application.job_requirement?.latitude || hospital?.latitude || 0);
  const hospitalLng = Number(application.job_requirement?.longitude || hospital?.longitude || 0);
  const hasLocation = hospitalLat !== 0 && hospitalLng !== 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="#0066FF" />
      {/* Header */}
      <LinearGradient
          colors={ModernColors.primary.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 40 }} /> 
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Hospital Profile */}
        <View style={styles.hospitalSection}>
            <View style={styles.logoContainer}>
                {hospital?.logo_url ? (
                    <Image source={{ uri: hospital.logo_url }} style={styles.logo} />
                ) : (
                    <Building2 size={32} color={ModernColors.primary.main} />
                )}
            </View>
            <Text style={styles.hospitalName}>{hospital?.name || 'Hospital Name'}</Text>
            <Text style={styles.departmentName}>{application.job_requirement?.department || 'General Medicine'}</Text>
        </View>

        {/* Status Banner (if checked in) */}
        {isCheckedIn && (
            <View style={styles.timerCard}>
                 {(session?.status === 'completed' || session?.check_out_time) ? (() => {
                    const checkInTime = new Date(session.check_in_time);
                    const checkOutTime = new Date(session.check_out_time || session.end_time);
                    let durationMins = session.work_duration_minutes;
                    
                    if (!durationMins || durationMins === 0) {
                        const diffMs = checkOutTime.getTime() - checkInTime.getTime();
                        durationMins = Math.floor(diffMs / 60000);
                    }
                    
                    const hours = Math.floor(durationMins / 60);
                    const minutes = Math.round(durationMins % 60);

                    return (
                        <>
                            <View style={styles.completedHeader}>
                                <CheckCircle size={20} color="#16A34A" style={{marginRight: 6}} />
                                <Text style={[styles.timerLabel, {color: '#16A34A', marginBottom: 0}]}>Session Completed</Text>
                            </View>
                            
                            <View style={styles.timeRow}>
                                <View style={styles.timeBlock}>
                                    <Text style={styles.timeLabel}>Check In</Text>
                                    <Text style={styles.timeValue}>
                                        {checkInTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </Text>
                                    <Text style={styles.dateLabel}>
                                        {checkInTime.toLocaleDateString([], {day: 'numeric', month: 'short'})}
                                    </Text>
                                </View>
                                
                                <View style={styles.dividerContainer}>
                                    <View style={styles.dividerLine} />
                                </View>

                                <View style={styles.timeBlock}>
                                    <Text style={styles.timeLabel}>Check Out</Text>
                                    <Text style={styles.timeValue}>
                                        {checkOutTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </Text>
                                    <Text style={styles.dateLabel}>
                                        {checkOutTime.toLocaleDateString([], {day: 'numeric', month: 'short'})}
                                    </Text>
                                </View>
                            </View>
                            
                            <View style={styles.durationBadge}>
                                <Clock size={14} color="#F59E0B" style={{marginRight: 6}} />
                                <Text style={styles.durationText}>
                                    Total Duration: <Text style={{fontWeight: '700', color: '#B45309'}}>{hours}h {minutes}m</Text>
                                </Text>
                            </View>
                        </>
                    );
                 })() : (
                    <>
                        <Text style={styles.timerLabel}>Session Active</Text>
                        <StopwatchTimer startTime={session.check_in_time} />
                        <Text style={styles.checkedInTime}>Checked in at {new Date(session.check_in_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    </>
                 )}
            </View>
        )}

        {/* Key Details Grid */}
        <View style={styles.gridContainer}>
            <View style={styles.gridItem}>
                <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
                    <Calendar size={20} color="#0284C7" />
                </View>
                <Text style={styles.gridLabel}>Date</Text>
                <Text style={styles.gridValue}>{formattedDate}</Text>
            </View>
            
            <View style={styles.gridItem}>
                <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
                    <Clock size={20} color="#D97706" />
                </View>
                <Text style={styles.gridLabel}>Time</Text>
                <Text style={styles.gridValue}>{formattedTime}</Text>
            </View>

            <View style={styles.gridItem}>
                <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
                    <DollarSign size={20} color="#16A34A" />
                </View>
                <Text style={styles.gridLabel}>Your Fee</Text>
                <Text style={styles.gridValue}>
                  ₹
                  {(() => {
                    // Get doctor's fee - check payment doctor_amount first, then session payment_amount, then requirement payment_amount
                    const doctorFee = Number(
                      session?.payments?.[0]?.doctor_amount || 
                      session?.payment_amount || 
                      application.job_requirement?.payment_amount || 
                      application.job_requirement?.salary_range_min || 
                      0
                    );
                    return doctorFee.toFixed(0);
                  })()}
                </Text>
            </View>
        </View>

        {/* Payment Details Section */}
        <View style={styles.paymentDetailsSection}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
            </View>
            
            {(() => {
                // Get doctor's fee - check payment doctor_amount first, then session payment_amount, then requirement payment_amount
                const doctorFee = Number(
                    session?.payments?.[0]?.doctor_amount || 
                    session?.payment_amount || 
                    application.job_requirement?.payment_amount || 
                    application.job_requirement?.salary_range_min || 
                    0
                );
                
                return (
                    <View style={styles.paymentDetailsCard}>
                        <View style={styles.paymentDetailRow}>
                            <Text style={[styles.paymentDetailLabel, { fontWeight: '700', fontSize: 16 }]}>Your Fee</Text>
                            <Text style={[styles.paymentDetailValue, { fontWeight: '700', fontSize: 18, color: '#16A34A' }]}>
                                ₹{doctorFee.toLocaleString('en-IN')}
                            </Text>
                        </View>
                        
                        {session?.payment_status && (
                            <>
                                <View style={styles.paymentDivider} />
                                <View style={styles.paymentStatusRow}>
                                    <Text style={styles.paymentDetailLabel}>Payment Status</Text>
                                    <View style={[
                                        styles.paymentStatusBadge,
                                        (session.payment_status === 'approved' || session.payment_status === 'released' || session.payment_status === 'paid') 
                                            ? { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }
                                            : { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' }
                                    ]}>
                                        <Text style={[
                                            styles.paymentStatusText,
                                            (session.payment_status === 'approved' || session.payment_status === 'released' || session.payment_status === 'paid')
                                                ? { color: '#15803D' }
                                                : { color: '#D97706' }
                                        ]}>
                                            {session.payment_status === 'approved' || session.payment_status === 'released' || session.payment_status === 'paid'
                                                ? 'Approved'
                                                : session.payment_status === 'pending'
                                                ? 'Pending'
                                                : 'Processing'}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                );
            })()}
        </View>

        {/* Location & Map Section */}
        <View style={styles.mapSection}>
             <View style={styles.sectionHeader}>
                 <Text style={styles.sectionTitle}>Location</Text>
                 {distance !== null && (
                     <View style={styles.distanceBadge}>
                         <Navigation size={12} color="#fff" />
                         <Text style={styles.distanceText}>
                             {distance < 1 ? `${Math.round(distance * 1000)}m away` : `${distance.toFixed(1)}km away`}
                         </Text>
                     </View>
                 )}
             </View>
             
             <Text style={styles.addressText} numberOfLines={2}>{address}</Text>

             <View style={styles.mapContainer}>
                 {hasLocation && currentLocation ? (
                     <CheckInMapView 
                        hospitalLocation={{ latitude: hospitalLat, longitude: hospitalLng, name: hospital?.name || 'Hospital' }}
                        doctorLocation={currentLocation}
                        height={220}
                     />
                 ) : (
                     <View style={styles.mapPlaceholder}>
                         <Text style={{color: NeutralColors.textSecondary}}>Map loading or location unavailable...</Text>
                     </View>
                 )}
                 
                 <TouchableOpacity style={styles.navButton} onPress={openMaps}>
                     <Navigation size={16} color="#fff" />
                 </TouchableOpacity>
             </View>
        </View>


        {/* Action Buttons */}
        {!isCheckedIn && (
            <View style={styles.actionContainer}>
                
                {/* 100m Reminder - Only show if not waiting to check in */}
                {/* Actually, always show inside 100m hint */}
                <View style={styles.checkInInfo}>
                    <Text style={styles.checkInHint}>
                         <MapPin size={12} color={NeutralColors.textSecondary} /> 500m inside to check in
                    </Text>
                </View>
                
                {/* Mandatory Share Live Reminder */}
                {!isSharingLive && (
                    <View style={styles.reminderBox}>
                        <AlertTriangle size={16} color="#D97706" />
                        <Text style={styles.reminderText}>
                           Mandatory: Share live location to ensure availability.
                        </Text>
                    </View>
                )}

                <View style={styles.buttonRow}>
                    {/* Share Live Button */}
                    <TouchableOpacity 
                        style={[
                            styles.actionButton, 
                            isSharingLive ? styles.successBtn : styles.primaryBtn,
                             // If sharing, it becomes small (flex: 0 or explicit width) managed by container if needed
                             isSharingLive && { flex: 0, width: 60, backgroundColor: '#DCFCE7' } 
                        ]}
                        onPress={handleStartTracking}
                        disabled={isSharingLive}
                    >
                        {isSharingLive ? (
                             <Check size={24} color="#16A34A" />
                        ) : (
                             <>
                                <Share2 size={20} color="#fff" />
                                <Text style={styles.btnTextPrimary}>Share Live Location</Text>
                             </>
                        )}
                    </TouchableOpacity>

                    {/* Check In Button - Only fully prominent if sharing live is done? User didn't say that, but likely. 
                        User said "share live shud be seen as mandotry... after click only tick shud be seen before that full blue button"
                        So if Shared -> Tick. Then Check In is available.
                    */}
                    <TouchableOpacity 
                        style={[
                            styles.actionButton, 
                            styles.primaryBtn,
                            (checkingIn || (distance && distance > 0.1)) ? styles.disabledBtn : null,
                            // If sharing is NOT done, maybe disable check in? Or just keep parallel. User said mandatory.
                            // I won't force disable check-in via code unless requested, but visual emphasis is on Share first.
                        ]}
                        onPress={handleCheckIn}
                        disabled={checkingIn}
                    >
                        {checkingIn ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <MapPin size={20} color="#fff" />
                                <Text style={styles.btnTextPrimary}>Check In</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        )}

        {/* Finish Work / Payment Status Section */}
        {isCheckedIn && (
            <View style={styles.actionContainer}>
                {session?.status === 'completed' ? (
                     <View style={styles.statusCard}>
                        <CheckCircle size={48} color="#16A34A" style={{marginBottom: 12}} />
                        <Text style={styles.statusTitle}>Work Completed</Text>
                        <Text style={styles.statusSub}>Waiting for hospital review & payment.</Text>
                        
                        {(session.payment_status === 'approved' || session.payment_status === 'released' || session.payment_status === 'paid') ? (
                          <View style={[styles.paymentBox, { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' }]}>
                              <CheckCircle size={20} color="#16A34A" />
                              <Text style={[styles.paymentText, { color: '#15803D' }]}>Payment Approved</Text>
                          </View>
                        ) : (
                          <View style={styles.paymentBox}>
                              <DollarSign size={20} color="#D97706" />
                              <Text style={styles.paymentText}>Payment Pending</Text>
                          </View>
                        )}
                     </View>
                ) : (
                    <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => {
                            Alert.alert(
                                "Finish Work?",
                                "Are you sure you want to stop the timer and finish the session?",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Yes, Finish", onPress: handleFinishWork }
                                ]
                            );
                        }}
                    >
                        <Clock size={20} color="#fff" />
                        <Text style={styles.btnTextPrimary}>Finish Work</Text>
                    </TouchableOpacity>
                )}
            </View>
        )}

        {/* Reviews Section - Show after completion */}
        {session?.status === 'completed' && session?.ratings && session.ratings.length > 0 && (
          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Hospital Review</Text>
            {session.ratings
              .filter((rating: any) => rating.rated_by === 'hospital')
              .map((rating: any, index: number) => (
                <View key={index} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.starRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={20}
                          color={star <= rating.rating ? '#FCD34D' : '#E5E7EB'}
                          fill={star <= rating.rating ? '#FCD34D' : 'transparent'}
                        />
                      ))}
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(rating.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                  {rating.review && (
                    <Text style={styles.reviewText}>{rating.review}</Text>
                  )}
                </View>
              ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    // Background color removed in favor of gradient, no border bottom
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF', // White text
  },
  backButton: {
    padding: 8,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  hospitalSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    // Add top spacing if user scrolls up? 
    // Actually, normally header is sticky or fixed. Here it is fixed.
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  hospitalName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
    textAlign: 'center',
  },
  departmentName: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  timerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkedInTime: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 16,
  },
  timeBlock: {
      alignItems: 'center',
      flex: 1,
  },
  timeLabel: {
      fontSize: 11,
      color: '#64748B',
      marginBottom: 4,
      fontWeight: '600',
      textTransform: 'uppercase',
  },
  timeValue: {
      fontSize: 18,
      fontWeight: '700',
      color: '#0F172A',
  },
  dateLabel: {
      fontSize: 11,
      color: '#94A3B8',
      marginTop: 2,
  },
  dividerContainer: {
      width: 1,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
  },
  dividerLine: {
      width: 1,
      height: '100%',
      backgroundColor: '#E2E8F0',
  },
  durationBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF3C7',
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#FCD34D',
  },
  durationText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#92400E',
  },
  gridContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  mapSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22C55E', // Green
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 18,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    height: 220,
    backgroundColor: '#F1F5F9',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: ModernColors.primary.main, // Updated to ModernColors
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  checkInInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  checkInHint: {
    fontSize: 12,
    color: '#64748B',
  },
  reminderBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  reminderText: {
    fontSize: 12,
    color: '#D97706',
    flex: 1,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: ModernColors.primary.main,
  },
  primaryBtn: {
    backgroundColor: ModernColors.primary.main,
  },
  successBtn: {
     backgroundColor: '#DCFCE7',
     borderColor: '#16A34A',
     borderWidth: 1,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusCard: {
      backgroundColor: '#fff',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
      width: '100%',
  },
  statusTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#0F172A',
      marginBottom: 8,
  },
  statusSub: {
      fontSize: 14,
      color: '#64748B',
      marginBottom: 20,
      textAlign: 'center',
  },
  paymentBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      gap: 8,
  },
  paymentText: {
      color: '#D97706',
      fontWeight: '600',
      fontSize: 14,
  },
  reviewSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  reviewSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  starRating: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#64748B',
  },
  reviewText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 20,
  },
  paymentDetailsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 24,
  },
  paymentDetailsCard: {
    marginTop: 12,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentDetailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  paymentDetailValue: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
