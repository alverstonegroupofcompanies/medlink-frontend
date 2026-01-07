import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, Search, Filter, User, Clock, MapPin, Monitor, Eye, Building2, FileText, PlayCircle, CheckCircle, XCircle, ChevronRight } from 'lucide-react-native';

export default function ActivityLogs() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUserType, setFilterUserType] = useState('all'); // all, doctor, hospital, admin
  const [filterAction, setFilterAction] = useState('');
  const [pagination, setPagination] = useState<any>({});
  const [selectedLog, setSelectedLog] = useState<any>(null);

  useEffect(() => {
    loadLogs();
    loadStats();
    checkAuth();
  }, [filterUserType]);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadLogs = async (page = 1) => {
    try {
      setLoading(page === 1);
      const token = await AsyncStorage.getItem('admin_token');
      const params: any = {
        page,
        per_page: 50,
      };

      if (filterUserType !== 'all') params.user_type = filterUserType;
      if (filterAction) params.action = filterAction;

      const response = await axios.get(`${API_BASE_URL}/admin/activity-logs`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      if (response.data.status) {
        if (page === 1) {
          setLogs(response.data.logs.data || []);
        } else {
          setLogs([...logs, ...(response.data.logs.data || [])]);
        }
        setPagination(response.data.logs);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load activity logs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/activity-logs/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const getUserLogs = async (userType: string, userId: number) => {
    try {
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(
        `${API_BASE_URL}/admin/activity-logs/user/${userType}/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (response.data.status) {
        // Show logs in a modal or navigate to a detail page
        Alert.alert(
          'User Activity Logs',
          `${response.data.logs.data?.length || 0} logs found for this user`
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to load user logs');
    }
  };

  const filteredLogs = logs.filter((log) =>
    log.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionColor = (action: string) => {
    if (action.includes('login')) return '#10b981';
    if (action.includes('register')) return '#2563eb';
    if (action.includes('update') || action.includes('edit')) return '#f59e0b';
    if (action.includes('delete')) return '#ef4444';
    if (action.includes('job_requirement_posted')) return '#8b5cf6';
    if (action.includes('application_submitted')) return '#3b82f6';
    if (action.includes('application_approved')) return '#10b981';
    if (action.includes('application_rejected')) return '#ef4444';
    if (action.includes('job_session_created')) return '#06b6d4';
    if (action.includes('job_session_completed')) return '#10b981';
    if (action.includes('check_in')) return '#f59e0b';
    if (action.includes('cancelled') || action.includes('uncompleted')) return '#ef4444';
    return '#6b7280';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('job_requirement_posted')) return <Building2 size={16} color={getActionColor(action)} />;
    if (action.includes('application_submitted') || action.includes('application_approved')) return <CheckCircle size={16} color={getActionColor(action)} />;
    if (action.includes('application_rejected')) return <XCircle size={16} color={getActionColor(action)} />;
    if (action.includes('job_session_created') || action.includes('job_session_completed')) return <PlayCircle size={16} color={getActionColor(action)} />;
    if (action.includes('check_in')) return <Clock size={16} color={getActionColor(action)} />;
    return <User size={16} color={getActionColor(action)} />;
  };

  const formatActionText = (action: string) => {
    const actionMap: { [key: string]: string } = {
      'job_requirement_posted': 'Job Requirement Posted',
      'application_submitted': 'Application Submitted',
      'application_approved': 'Application Approved',
      'application_rejected': 'Application Rejected',
      'job_session_created': 'Job Session Created',
      'job_session_assigned': 'Job Session Assigned',
      'job_session_completed': 'Job Session Completed',
      'check_in': 'Checked In',
      'login': 'Logged In',
      'register': 'Registered',
    };
    return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'doctor':
        return '#3b82f6';
      case 'hospital':
        return '#10b981';
      case 'admin':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  if (loading && !logs.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e293b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066FF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#10b981' }]}>{stats.today}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#2563eb' }]}>{stats.this_week}</Text>
            <Text style={styles.statLabel}>This Week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#f59e0b' }]}>{stats.this_month}</Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>User Type:</Text>
        <View style={styles.filterButtons}>
          {['all', 'doctor', 'hospital', 'admin'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterButton,
                filterUserType === type && styles.filterButtonActive,
              ]}
              onPress={() => setFilterUserType(type)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  filterUserType === type && styles.filterButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6b7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email, or action..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadLogs()} />
        }
      >
        {filteredLogs.map((log) => (
          <TouchableOpacity
            key={log.id}
            style={styles.logCard}
            onPress={() => setSelectedLog(log)}
          >
            <View style={styles.logHeader}>
              <View style={styles.logUserInfo}>
                <View
                  style={[
                    styles.userTypeBadge,
                    { backgroundColor: getUserTypeColor(log.user_type) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.userTypeText,
                      { color: getUserTypeColor(log.user_type) },
                    ]}
                  >
                    {log.user_type}
                  </Text>
                </View>
                <View style={styles.logUserDetails}>
                  <Text style={styles.logUserName}>{log.user_name || 'N/A'}</Text>
                  <Text style={styles.logUserEmail}>{log.user_email}</Text>
                </View>
              </View>
              <Text style={styles.logTime}>{log.created_at_human}</Text>
            </View>

            <View style={styles.logAction}>
              <View
                style={[
                  styles.actionBadge,
                  { backgroundColor: getActionColor(log.action) + '20' },
                ]}
              >
                {getActionIcon(log.action)}
                <Text
                  style={[
                    styles.actionText,
                    { color: getActionColor(log.action) },
                  ]}
                >
                  {formatActionText(log.action)}
                </Text>
              </View>
            </View>

            {log.description && (
              <Text style={styles.logDescription} numberOfLines={3}>
                {log.description}
              </Text>
            )}

            {/* Show related entity details */}
            {log.related_entities && (
              <View style={styles.relatedEntities}>
                {log.related_entities.job_requirement && (
                  <View style={styles.entityDetail}>
                    <Building2 size={14} color="#8b5cf6" />
                    <Text style={styles.entityText}>
                      Job: {log.related_entities.job_requirement.department} - {log.related_entities.job_requirement.work_type} at {log.related_entities.job_requirement.hospital_name}
                    </Text>
                  </View>
                )}
                {log.related_entities.job_application && (
                  <View style={styles.entityDetail}>
                    <FileText size={14} color="#3b82f6" />
                    <Text style={styles.entityText}>
                      Application: Dr. {log.related_entities.job_application.doctor_name} - {log.related_entities.job_application.department} at {log.related_entities.job_application.hospital_name}
                      {log.related_entities.job_application.status && (
                        <Text style={[
                          styles.statusBadge,
                          log.related_entities.job_application.status === 'selected' && { color: '#10b981' },
                          log.related_entities.job_application.status === 'rejected' && { color: '#ef4444' },
                          log.related_entities.job_application.status === 'pending' && { color: '#f59e0b' },
                        ]}>
                          {' '}({log.related_entities.job_application.status})
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
                {log.related_entities.job_session && (
                  <View style={styles.entityDetail}>
                    <PlayCircle size={14} color="#06b6d4" />
                    <Text style={styles.entityText}>
                      Session: Dr. {log.related_entities.job_session.doctor_name} - {log.related_entities.job_session.department} at {log.related_entities.job_session.hospital_name}
                      {log.related_entities.job_session.status && (
                        <Text style={[
                          styles.statusBadge,
                          log.related_entities.job_session.status === 'completed' && { color: '#10b981' },
                          log.related_entities.job_session.status === 'cancelled' && { color: '#ef4444' },
                          log.related_entities.job_session.status === 'in_progress' && { color: '#3b82f6' },
                          log.related_entities.job_session.status === 'scheduled' && { color: '#f59e0b' },
                        ]}>
                          {' '}({log.related_entities.job_session.status})
                        </Text>
                      )}
                      {log.related_entities.job_session.duration_minutes && (
                        <Text style={styles.durationText}>
                          {' '}- Duration: {log.related_entities.job_session.duration_minutes} min
                        </Text>
                      )}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.logFooter}>
              {log.ip_address && (
                <View style={styles.logInfo}>
                  <MapPin size={14} color="#6b7280" />
                  <Text style={styles.logInfoText}>{log.ip_address}</Text>
                </View>
              )}
              {log.user_agent && (
                <View style={styles.logInfo}>
                  <Monitor size={14} color="#6b7280" />
                  <Text style={styles.logInfoText} numberOfLines={1}>
                    {log.user_agent.substring(0, 30)}...
                  </Text>
                </View>
              )}
            </View>

            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <TouchableOpacity
                style={styles.metadataButton}
                onPress={() => {
                  const details = log.related_entities 
                    ? `Details:\n\n${JSON.stringify(log.related_entities, null, 2)}\n\nMetadata:\n${JSON.stringify(log.metadata, null, 2)}`
                    : JSON.stringify(log.metadata, null, 2);
                  Alert.alert('Full Details', details);
                }}
              >
                <Eye size={14} color="#2563eb" />
                <Text style={styles.metadataButtonText}>View Full Details</Text>
                <ChevronRight size={14} color="#2563eb" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}

        {pagination.current_page < pagination.last_page && (
          <TouchableOpacity
            style={styles.loadMoreButton}
            onPress={() => loadLogs(pagination.current_page + 1)}
          >
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}

        {filteredLogs.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No activity logs found</Text>
          </View>
        )}
      </ScrollView>

      {/* Log Detail Modal */}
      {selectedLog && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Activity Log Details</Text>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>User:</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.user_name} ({selectedLog.user_email})
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{selectedLog.user_type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Action:</Text>
                <Text style={styles.detailValue}>{selectedLog.action}</Text>
              </View>
              {selectedLog.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description:</Text>
                  <Text style={styles.detailValue}>{selectedLog.description}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IP Address:</Text>
                <Text style={styles.detailValue}>{selectedLog.ip_address || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>User Agent:</Text>
                <Text style={styles.detailValue}>{selectedLog.user_agent || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp:</Text>
                <Text style={styles.detailValue}>
                  {new Date(selectedLog.created_at).toLocaleString()}
                </Text>
              </View>
              {/* Related Entities */}
              {selectedLog.related_entities && (
                <>
                  {selectedLog.related_entities.job_requirement && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Job Requirement:</Text>
                      <Text style={styles.detailValue}>
                        {selectedLog.related_entities.job_requirement.department} - {selectedLog.related_entities.job_requirement.work_type}
                        {'\n'}Hospital: {selectedLog.related_entities.job_requirement.hospital_name}
                      </Text>
                    </View>
                  )}
                  {selectedLog.related_entities.job_application && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Application Details:</Text>
                      <Text style={styles.detailValue}>
                        Doctor: {selectedLog.related_entities.job_application.doctor_name}
                        {'\n'}Department: {selectedLog.related_entities.job_application.department}
                        {'\n'}Hospital: {selectedLog.related_entities.job_application.hospital_name}
                        {'\n'}Status: {selectedLog.related_entities.job_application.status}
                      </Text>
                    </View>
                  )}
                  {selectedLog.related_entities.job_session && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Job Session:</Text>
                      <Text style={styles.detailValue}>
                        Doctor: {selectedLog.related_entities.job_session.doctor_name}
                        {'\n'}Department: {selectedLog.related_entities.job_session.department}
                        {'\n'}Hospital: {selectedLog.related_entities.job_session.hospital_name}
                        {'\n'}Status: {selectedLog.related_entities.job_session.status}
                        {selectedLog.related_entities.job_session.duration_minutes && (
                          <>
                            {'\n'}Duration: {selectedLog.related_entities.job_session.duration_minutes} minutes
                          </>
                        )}
                      </Text>
                    </View>
                  )}
                </>
              )}
              {selectedLog.metadata && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Metadata:</Text>
                  <Text style={styles.detailValue}>
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: 8,
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  logCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  userTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  logUserDetails: {
    flex: 1,
  },
  logUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  logUserEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  logTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  logAction: {
    marginBottom: 8,
  },
  actionBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  relatedEntities: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  entityDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 6,
  },
  entityText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    flex: 1,
  },
  statusBadge: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  logDescription: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    lineHeight: 20,
  },
  logFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  logInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logInfoText: {
    fontSize: 12,
    color: '#6b7280',
  },
  metadataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    gap: 6,
    justifyContent: 'space-between',
  },
  metadataButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    flex: 1,
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
  },
  modalBody: {
    padding: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
});

