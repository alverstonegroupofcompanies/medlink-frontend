import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  MapPin,
  Calendar,
  Timer,
  Building2,
  ArrowRight
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { formatISTDateTime, formatISTDateWithWeekday } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';
import { Card, Text, Button, Surface, Avatar, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';

export default function HospitalJobSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      loadSession();
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }, [sessionId])
  );

  useEffect(() => {
    if (session?.check_in_time && !session?.end_time) {
      const checkInTime = new Date(session.check_in_time);
      
      const updateElapsed = () => {
        const now = new Date();
        const elapsed = now.getTime() - checkInTime.getTime();
        setTimeElapsed(Math.max(0, elapsed));
      };
      
      updateElapsed();
      intervalRef.current = setInterval(updateElapsed, 1000);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, [session]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/hospital/sessions/${sessionId}`);
      if (!response.data.session) {
        Alert.alert('Session Not Found', 'The job session could not be found.');
        router.back();
        return;
      }
      setSession(response.data.session);
    } catch (error: any) {
      console.error('Error loading session:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
      </View>
    );
  }

  if (!session) return null;

  const doctor = session.doctor;
  const requirement = session.job_requirement;
  const isCompleted = session.status === 'completed';
  const isInProgress = session.status === 'in_progress' && session.check_in_time;
  const isPaid = session.payment_status === 'paid' || session.payment_status === 'released';

  return (
    <ScreenSafeArea style={styles.container}>
      <StatusBar style="dark" backgroundColor="#fff" />
      
      {/* Header */}
      <Surface style={styles.headerSurface} elevation={0}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={NeutralColors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Session</Text>
          <View style={{ width: 40 }} />
        </View>
      </Surface>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Doctor Info Card */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
             <View style={styles.doctorRow}>
                {doctor?.profile_photo ? (
                    <Avatar.Image 
                        size={60} 
                        source={{ uri: getFullImageUrl(doctor.profile_photo) }} 
                        style={{ backgroundColor: '#F1F5F9' }}
                    />
                ) : (
                    <Avatar.Text 
                        size={60} 
                        label={doctor?.name?.substring(0,2) || 'Dr'} 
                        style={{ backgroundColor: '#F1F5F9' }} 
                        color={PrimaryColors.main}
                    />
                )}
                <View style={{marginLeft: 16, flex: 1}}>
                    <Text variant="titleMedium" style={{fontWeight: '700', color: '#0F172A'}}>Dr. {doctor?.name || 'Doctor'}</Text>
                    <Text variant="bodyMedium" style={{color: '#64748B'}}>{requirement?.department || 'Department'}</Text>
                </View>
            </View>
          </Card.Content>
        </Card>

        {/* Status Card & Action */}
        <Card style={styles.card} mode="outlined">
          <Card.Content>
             <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                 <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                    <CheckCircle size={24} color={isCompleted ? StatusColors.success : PrimaryColors.main} />
                    <Text variant="titleMedium" style={{fontWeight: '600'}}>Status</Text>
                 </View>
                 <Chip 
                    style={{backgroundColor: isCompleted ? '#DCFCE7' : isInProgress ? '#EFF6FF' : '#F1F5F9'}} 
                    textStyle={{color: isCompleted ? StatusColors.success : isInProgress ? PrimaryColors.main : '#64748B', fontWeight: 'bold'}}
                 >
                    {isCompleted ? 'COMPLETED' : isInProgress ? 'IN PROGRESS' : 'SCHEDULED'}
                 </Chip>
             </View>

             {(isInProgress || session.status === 'scheduled') && (
               <Button 
                 mode="contained"
                 onPress={() => router.push(`/hospital/live-tracking?sessionId=${session.id}&doctorId=${doctor?.id}`)}
                 style={{ marginTop: 16, backgroundColor: PrimaryColors.main, borderRadius: 8 }}
                 icon={() => <MapPin size={18} color="#fff" />}
                 labelStyle={{fontSize: 16, fontWeight: '600'}}
               >
                 Track Live Location
               </Button>
             )}

             {isCompleted && (
                 <Button 
                    mode="contained"
                    onPress={() => router.push(`/hospital/review-session/${session.id}`)}
                    style={{ marginTop: 16, backgroundColor: isPaid ? '#16A34A' : PrimaryColors.main, borderRadius: 8 }}
                    contentStyle={{height: 48}}
                    icon={() => <ArrowRight size={18} color="#fff" />}
                    labelStyle={{fontSize: 16, fontWeight: '600'}}
                 >
                    {isPaid ? 'View Payment Details' : 'Review & Release Payment'}
                 </Button>
             )}
          </Card.Content>
        </Card>

        {/* Work Timer (if in progress) */}
        {isInProgress && (
          <Card style={styles.card} mode="outlined">
            <Card.Content>
               <View style={{alignItems: 'center', paddingVertical: 10}}>
                   <Timer size={32} color={PrimaryColors.main} style={{marginBottom: 8}} />
                   <Text variant="displayMedium" style={{fontWeight: '700', color: PrimaryColors.main, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'}}>
                        {formatTime(timeElapsed)}
                   </Text>
                   <Text variant="labelMedium" style={{color: '#64748B'}}>Time Elapsed</Text>
               </View>
            </Card.Content>
          </Card>
        )}

        {/* Time Details */}
        <Card style={styles.card} mode="outlined">
           <Card.Content>
               <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
                   <Clock size={20} color={PrimaryColors.main} />
                   <Text variant="titleMedium" style={{fontWeight: '600'}}>Time Log</Text>
               </View>
               <Divider style={{marginBottom: 12}} />
               
               <View style={styles.infoRow}>
                   <Text style={styles.infoLabel}>Date</Text>
                   <Text style={styles.infoValue}>{formatISTDateWithWeekday(session.session_date)}</Text>
               </View>
               <View style={styles.infoRow}>
                   <Text style={styles.infoLabel}>Check In</Text>
                   <Text style={styles.infoValue}>
                       {session.check_in_time ? formatISTDateTime(session.check_in_time) : '-'}
                   </Text>
               </View>
               {session.end_time && (
                 <View style={styles.infoRow}>
                   <Text style={styles.infoLabel}>Check Out</Text>
                   <Text style={styles.infoValue}>{formatISTDateTime(session.end_time)}</Text>
                 </View>
               )}
           </Card.Content>
        </Card>

        {/* Payment Preview (if not completed or just brief info) */}
        <Card style={styles.card} mode="outlined">
            <Card.Content>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12}}>
                    <Building2 size={20} color={PrimaryColors.main} />
                    <Text variant="titleMedium" style={{fontWeight: '600'}}>Payment Estimate</Text>
                </View>
                <Text style={{fontSize: 24, fontWeight: '700', color: isPaid ? '#15803D' : '#0F172A'}}>
                    ₹{session.payment_amount || '0'}
                </Text>
                <Text style={{color: isPaid ? '#15803D' : '#64748B', fontSize: 13, marginTop: 4}}>
                    {isPaid ? '• Payment Completed' : '• Payment pending approval'}
                </Text>
            </Card.Content>
        </Card>

      </ScrollView>
    </ScreenSafeArea>
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
  headerSurface: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'ios' ? 0 : 20, 
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  content: {
    padding: 20,
    paddingBottom: 50,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
      color: '#64748B',
      fontSize: 14,
  },
  infoValue: {
      color: '#0F172A',
      fontWeight: '600',
      fontSize: 14,
  }
});
