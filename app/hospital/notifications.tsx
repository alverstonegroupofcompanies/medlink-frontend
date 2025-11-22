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
} from 'react-native';
import { router } from 'expo-router';
import { Bell, Check, Clock, Building2, User } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import API from '../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  data?: any;
}

export default function HospitalNotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await API.get('/hospital/notifications');
      setNotifications(response.data.notifications || []);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await API.put(`/hospital/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.put('/hospital/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      Alert.alert('Success', 'All notifications marked as read.');
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to mark all notifications as read');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_application':
        return <User size={24} color={PrimaryColors.main} />;
      default:
        return <Bell size={24} color={PrimaryColors.main} />;
    }
  };

  return (
    <ScreenSafeArea backgroundColor={NeutralColors.background}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.main} />
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead} style={styles.markAllReadButton}>
          <Check size={20} color="#fff" />
          <Text style={styles.markAllReadText}>Mark All Read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PrimaryColors.main]} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Loading notifications...</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={48} color={NeutralColors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No notifications yet.</Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, notification.is_read && styles.readCard]}
              onPress={() => !notification.is_read && markAsRead(notification.id)}
              activeOpacity={0.8}
            >
              <View style={styles.notificationIconContainer}>
                {getNotificationIcon(notification.type)}
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMessage}>{notification.message}</Text>
                <View style={styles.notificationFooter}>
                  <Clock size={12} color={NeutralColors.textSecondary} />
                  <Text style={styles.notificationTime}>{getTimeAgo(notification.created_at)}</Text>
                </View>
              </View>
              {!notification.is_read && (
                <View style={styles.unreadIndicator} />
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
    </ScreenSafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NeutralColors.background,
  },
  header: {
    backgroundColor: PrimaryColors.main,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  markAllReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  markAllReadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: NeutralColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: PrimaryColors.main,
  },
  readCard: {
    opacity: 0.7,
    borderLeftColor: NeutralColors.textSecondary,
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PrimaryColors.lighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PrimaryColors.dark,
    marginBottom: 4,
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
    gap: 6,
  },
  notificationTime: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PrimaryColors.main,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});
