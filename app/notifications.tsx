import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Bell, Check, ChevronLeft, Clock, Building2, User } from 'lucide-react-native';
import { DoctorPrimaryColors as PrimaryColors, DoctorNeutralColors as NeutralColors } from '@/constants/doctor-theme';
import API from './api';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
  sender?: {
    profile_photo?: string;
    logo_url?: string;
    name?: string;
  };
  sender_type?: 'doctor' | 'hospital';
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  const loadNotifications = async () => {
    try {
      // Try new endpoint first, fallback to old one
      let response;
      try {
        response = await API.get('/doctor/notifications/list');
      } catch (newError: any) {
        // Fallback to old endpoint if new one fails
        if (newError.response?.status === 404) {
          response = await API.get('/doctor/notifications');
        } else {
          throw newError;
        }
      }
      setNotifications(response.data.notifications || []);
    } catch (error: any) {
      console.error('Error loading notifications:', error);
      // Only show alert if it's not a 404 (route not found - might be server config issue)
      if (error.response?.status !== 404) {
        Alert.alert('Error', 'Failed to load notifications');
      } else {
        // 404 means route doesn't exist - set empty array silently
        setNotifications([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await API.put(`/doctor/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.put('/doctor/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      Alert.alert('Success', 'All notifications marked as read');
    } catch (error: any) {
      console.error('Error marking all as read:', error);
      Alert.alert('Error', 'Failed to mark all as read');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'job_approved':
        return <Building2 size={20} color={PrimaryColors.main} />;
      default:
        return <Bell size={20} color={PrimaryColors.main} />;
    }
  };

  const getNotificationImage = (notification: Notification) => {
    // Check if sender has profile photo (doctor) or logo (hospital)
    if (notification.sender?.profile_photo) {
      return notification.sender.profile_photo;
    }
    if (notification.sender?.logo_url) {
      return notification.sender.logo_url;
    }
    // Also check in data object
    if (notification.data?.sender?.profile_photo) {
      return notification.data.sender.profile_photo;
    }
    if (notification.data?.sender?.logo_url) {
      return notification.data.sender.logo_url;
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {notifications.some(n => !n.is_read) && (
          <TouchableOpacity 
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={64} color={NeutralColors.textSecondary} />
            <Text style={styles.emptyText}>No notifications</Text>
            <Text style={styles.emptySubtext}>You'll see notifications here when hospitals approve your applications</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[
                styles.notificationCard,
                !notification.is_read && styles.unreadCard,
              ]}
              onPress={() => {
                if (!notification.is_read) {
                  markAsRead(notification.id);
                }
              }}
            >
              <View style={styles.notificationIcon}>
                {getNotificationImage(notification) && !imageErrors.has(notification.id) ? (
                  <Image
                    source={{ uri: getNotificationImage(notification)! }}
                    style={styles.notificationImage}
                    onError={() => {
                      setImageErrors(prev => new Set(prev).add(notification.id));
                    }}
                  />
                ) : (
                  getNotificationIcon(notification.type)
                )}
              </View>
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={styles.notificationTitle}>{notification.title}</Text>
                  {!notification.is_read && (
                    <View style={styles.unreadDot} />
                  )}
                </View>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <View style={styles.notificationFooter}>
                  <View style={styles.timeContainer}>
                    <Clock size={12} color={NeutralColors.textSecondary} />
                    <Text style={styles.timeText}>
                      {formatDate(notification.created_at)}
                    </Text>
                  </View>
                  {!notification.is_read && (
                    <TouchableOpacity
                      style={styles.readButton}
                      onPress={() => markAsRead(notification.id)}
                    >
                      <Check size={14} color={PrimaryColors.main} />
                      <Text style={styles.readButtonText}>Mark read</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  header: {
    backgroundColor: PrimaryColors.main,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  markAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: PrimaryColors.main,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PrimaryColors.lightest,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  notificationImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PrimaryColors.main,
    marginLeft: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: PrimaryColors.lightest,
  },
  readButtonText: {
    fontSize: 12,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
});

