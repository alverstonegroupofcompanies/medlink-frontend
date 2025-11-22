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
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, User, Building2, FileText, Calendar, MapPin, Phone, Mail, DollarSign, PlayCircle, CheckCircle2, Eye, ChevronRight } from 'lucide-react-native';

export default function AdminApplications() {
  const router = useRouter();
  const [applications, setApplications] = useState<any>({
    all: [],
    applied: [],
    approved: [],
    rejected: [],
  });
  const [counts, setCounts] = useState<any>({
    total: 0,
    applied: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'applied' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadApplications();
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('admin_token');
    if (!token) {
      router.replace('/admin/login');
    }
  };

  const loadApplications = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('admin_token');
      const response = await axios.get(`${API_BASE_URL}/admin/applications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.status) {
        setApplications(response.data.applications);
        setCounts(response.data.counts);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircle size={20} color="#10b981" />;
      case 'rejected':
        return <XCircle size={20} color="#ef4444" />;
      default:
        return <Clock size={20} color="#f59e0b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'selected':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#f59e0b';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'selected':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Applied';
    }
  };

  const currentApplications = applications[activeTab] || [];

  if (loading) {
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
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Applications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All ({counts.total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'applied' && styles.tabActive]}
          onPress={() => setActiveTab('applied')}
        >
          <Text style={[styles.tabText, activeTab === 'applied' && styles.tabTextActive]}>
            Applied ({counts.applied})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
          onPress={() => setActiveTab('approved')}
        >
          <Text style={[styles.tabText, activeTab === 'approved' && styles.tabTextActive]}>
            Approved ({counts.approved})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
          onPress={() => setActiveTab('rejected')}
        >
          <Text style={[styles.tabText, activeTab === 'rejected' && styles.tabTextActive]}>
            Rejected ({counts.rejected})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadApplications} />
        }
      >
        {/* Summary Header */}
        <View style={styles.summaryHeader}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Applications</Text>
            <Text style={styles.summaryValue}>{counts.total || 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Applied</Text>
            <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{counts.applied || 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Approved</Text>
            <Text style={[styles.summaryValue, { color: '#10b981' }]}>{counts.approved || 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Rejected</Text>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{counts.rejected || 0}</Text>
          </View>
        </View>

        {currentApplications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={64} color="#cbd5e1" />
            <Text style={styles.emptyText}>No applications found</Text>
          </View>
        ) : (
          currentApplications.map((application: any) => (
            <View key={application.id} style={styles.applicationCard}>
              <View style={styles.applicationHeader}>
                <View style={styles.doctorInfo}>
                  <User size={24} color="#2563eb" />
                  <View style={styles.infoText}>
                    <Text style={styles.doctorName}>
                      {application.doctor?.name || 'Unknown Doctor'}
                    </Text>
                    <Text style={styles.doctorEmail}>
                      {application.doctor?.email || 'N/A'}
                    </Text>
                    <Text style={styles.specialization}>
                      {application.doctor?.specialization || 'N/A'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(application.status)}15` }]}>
                  {getStatusIcon(application.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(application.status) }]}>
                    {getStatusText(application.status)}
                  </Text>
                </View>
              </View>

              {/* Hospital/Job Posted By Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Building2 size={18} color="#10b981" />
                  <Text style={styles.sectionTitle}>Posted By Hospital</Text>
                </View>
                <View style={styles.hospitalInfo}>
                  <Text style={styles.hospitalName}>
                    {application.job_requirement?.hospital?.name || 'Unknown Hospital'}
                  </Text>
                  {application.job_requirement?.hospital?.address && (
                    <View style={styles.infoRow}>
                      <MapPin size={14} color="#64748b" />
                      <Text style={styles.infoText}>
                        {application.job_requirement.hospital.address}
                      </Text>
                    </View>
                  )}
                  {application.job_requirement?.hospital?.phone_number && (
                    <View style={styles.infoRow}>
                      <Phone size={14} color="#64748b" />
                      <Text style={styles.infoText}>
                        {application.job_requirement.hospital.phone_number}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Job Requirement Details */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <FileText size={18} color="#2563eb" />
                  <Text style={styles.sectionTitle}>Job Details</Text>
                </View>
                <View style={styles.jobDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Department:</Text>
                    <Text style={styles.detailValue}>
                      {application.job_requirement?.department || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Work Type:</Text>
                    <Text style={styles.detailValue}>
                      {application.job_requirement?.work_type || 'N/A'}
                    </Text>
                  </View>
                  {application.job_requirement?.work_required_date && (
                    <View style={styles.detailRow}>
                      <Calendar size={14} color="#64748b" />
                      <Text style={styles.detailLabel}>Work Date:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(application.job_requirement.work_required_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  )}
                  {(application.job_requirement?.salary_range_min || application.job_requirement?.salary_range_max) && (
                    <View style={styles.detailRow}>
                      <DollarSign size={14} color="#64748b" />
                      <Text style={styles.detailLabel}>Salary Range:</Text>
                      <Text style={styles.detailValue}>
                        ₹{application.job_requirement.salary_range_min?.toLocaleString() || '0'} - 
                        ₹{application.job_requirement.salary_range_max?.toLocaleString() || '0'}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {application.cover_letter && (
                <View style={styles.coverLetterSection}>
                  <Text style={styles.coverLetterLabel}>Cover Letter:</Text>
                  <Text style={styles.coverLetterText} numberOfLines={3}>
                    {application.cover_letter}
                  </Text>
                </View>
              )}

              {application.proposed_rate && (
                <View style={styles.rateSection}>
                  <Text style={styles.rateLabel}>Proposed Rate:</Text>
                  <Text style={styles.rateValue}>₹{application.proposed_rate}</Text>
                </View>
              )}

              {/* Job Session / Who Does The Job */}
              {application.job_session ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <PlayCircle size={18} color="#8b5cf6" />
                    <Text style={styles.sectionTitle}>Job Session (Who Does The Job)</Text>
                  </View>
                  <View style={styles.sessionDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Session Status:</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(application.job_session.status || 'pending')}15` }]}>
                        <Text style={[styles.detailValue, { color: getStatusColor(application.job_session.status || 'pending') }]}>
                          {application.job_session.status ? application.job_session.status.charAt(0).toUpperCase() + application.job_session.status.slice(1).replace('_', ' ') : 'N/A'}
                        </Text>
                      </View>
                    </View>
                    {application.job_session.session_date && (
                      <View style={styles.detailRow}>
                        <Calendar size={14} color="#64748b" />
                        <Text style={styles.detailLabel}>Session Date:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(application.job_session.session_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </Text>
                      </View>
                    )}
                    {application.job_session.check_in_time && (
                      <View style={styles.detailRow}>
                        <CheckCircle2 size={14} color="#10b981" />
                        <Text style={styles.detailLabel}>Check-In Time:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(application.job_session.check_in_time).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    )}
                    {application.job_session.check_in_verified && (
                      <View style={styles.detailRow}>
                        <CheckCircle size={14} color="#10b981" />
                        <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '600' }]}>
                          ✓ Check-In Verified
                        </Text>
                      </View>
                    )}
                    {application.job_session.check_out_time && (
                      <View style={styles.detailRow}>
                        <Clock size={14} color="#64748b" />
                        <Text style={styles.detailLabel}>Check-Out Time:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(application.job_session.check_out_time).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </Text>
                      </View>
                    )}
                    {application.job_session.payment_amount && (
                      <View style={styles.detailRow}>
                        <DollarSign size={14} color="#10b981" />
                        <Text style={styles.detailLabel}>Payment Amount:</Text>
                        <Text style={[styles.detailValue, { color: '#10b981', fontWeight: '700' }]}>
                          ₹{application.job_session.payment_amount.toLocaleString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ) : application.status === 'selected' ? (
                <View style={styles.section}>
                  <Text style={styles.noSessionText}>
                    ⚠️ Application approved but no job session created yet
                  </Text>
                </View>
              ) : null}

              {/* Application Timeline */}
              <View style={styles.timelineSection}>
                <Text style={styles.timelineLabel}>Application Timeline:</Text>
                <View style={styles.timelineItem}>
                  <Clock size={12} color="#64748b" />
                  <Text style={styles.timelineText}>
                    Applied: {new Date(application.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                {application.updated_at && application.updated_at !== application.created_at && (
                  <View style={styles.timelineItem}>
                    <CheckCircle size={12} color="#64748b" />
                    <Text style={styles.timelineText}>
                      Last Updated: {new Date(application.updated_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                )}
              </View>

              {/* View All Button */}
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push(`/admin/applications/${application.id}`)}
              >
                <Eye size={18} color="#fff" />
                <Text style={styles.viewAllButtonText}>View All Details</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#1e293b',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#1e293b',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: Platform.select({ 
      ios: 'Inter-SemiBold', 
      android: 'Inter-SemiBold',
      default: 'Inter-SemiBold'
    }),
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 16,
  },
  applicationCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
  doctorEmail: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  specialization: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hospitalInfo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  hospitalDetails: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  department: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 2,
  },
  workType: {
    fontSize: 13,
    color: '#94a3b8',
  },
  coverLetterSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  coverLetterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  coverLetterText: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
  },
  rateSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  rateLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  rateValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  sessionSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sessionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  sessionValue: {
    fontSize: 14,
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  checkInText: {
    fontSize: 12,
    color: '#10b981',
    marginTop: 4,
  },
  section: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
  },
  jobDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    minWidth: 100,
  },
  detailValue: {
    fontSize: 13,
    color: '#1e293b',
    fontWeight: '600',
    flex: 1,
  },
  sessionDetails: {
    gap: 8,
  },
  noSessionText: {
    fontSize: 13,
    color: '#f59e0b',
    fontStyle: 'italic',
  },
  timelineSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  timelineLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  timelineText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  viewAllButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  summaryHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: Platform.select({ 
      ios: 'Poppins-Bold', 
      android: 'Poppins-Bold',
      default: 'Poppins-Bold'
    }),
  },
});

