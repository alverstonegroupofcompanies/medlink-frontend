import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, User, Calendar, MapPin, Building2, CheckCircle, XCircle, Clock, Star, GitCompare, X, Search, ExternalLink, BarChart3 } from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors, HospitalStatusColors as StatusColors } from '@/constants/hospital-theme';
import API from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { formatISTDateTime, formatISTDateTimeLong } from '@/utils/timezone';
import { getFullImageUrl } from '@/utils/url-helper';
import { RazorpayPaymentWidget } from '@/components/RazorpayPaymentWidget';

const HOSPITAL_TOKEN_KEY = 'hospitalToken';
const HOSPITAL_INFO_KEY = 'hospitalInfo';

export default function ApplicationsScreen() {
  const { requirementId } = useLocalSearchParams<{ requirementId: string }>();
  const [applications, setApplications] = useState<any[]>([]);
  const [requirement, setRequirement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hospital, setHospital] = useState<any>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [processingAction, setProcessingAction] = useState<'accept' | 'reject' | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Payment state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [pendingApplicationId, setPendingApplicationId] = useState<number | null>(null);

  // Doctor comparison state
  const [selectedForComparison, setSelectedForComparison] = useState<Set<number>>(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  useEffect(() => {
    loadHospital();
    loadApplications();
  }, [requirementId]);

  // Refresh applications when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (requirementId) {
        loadApplications(false);
      }
      // Ensure status bar is always blue
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor(PrimaryColors.dark, true);
        StatusBar.setBarStyle('light-content', true);
        StatusBar.setTranslucent(false);
      }
      StatusBar.setBarStyle('light-content', true);
      return () => {};
    }, [requirementId])
  );

  const loadHospital = async () => {
    try {
      const info = await AsyncStorage.getItem(HOSPITAL_INFO_KEY);
      if (info) {
        setHospital(JSON.parse(info));
      }
    } catch (error) {
      console.error('Error loading hospital:', error);
    }
  };

  const loadApplications = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      console.log('📥 Loading applications for requirement:', requirementId);
      const response = await API.get(`/hospital/requirements/${requirementId}/applications`);
      console.log('📥 Loaded applications:', response.data.applications?.length || 0);
      console.log('📥 Applications data:', response.data.applications?.map((a: any) => ({ 
        id: a.id, 
        status: a.status,
        doctor_name: a.doctor?.name 
      })) || []);
      
      setApplications(response.data.applications || []);
      setRequirement(response.data.requirement || null);
    } catch (error: any) {
      console.error('❌ Error loading applications:', error);
      if (showLoading) {
        Alert.alert('Error', error.response?.data?.message || 'Failed to load applications');
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'selected':
        return StatusColors.success;
      case 'rejected':
        return StatusColors.error;
      case 'pending':
        return StatusColors.warning;
      default:
        return NeutralColors.textTertiary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'selected':
        return <CheckCircle size={16} color={StatusColors.success} />;
      case 'rejected':
        return <XCircle size={16} color={StatusColors.error} />;
      case 'pending':
        return <Clock size={16} color={StatusColors.warning} />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'selected':
        return 'Selected';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Waiting for Approval';
      default:
        return status;
    }
  };

  const handleAccept = async (applicationId: number, doctorName: string) => {
    console.log('🔵 handleAccept called for application:', applicationId);
    
    // Find the application to get doctor and requirement details
    const application = applications.find(app => app.id === applicationId);
    if (!application) {
      Alert.alert('Error', 'Application not found');
      return;
    }

    // Calculate payment amount based on requirement
    // Use payment_amount (new) or salary_range_max (legacy) or default to 500
    const amount = requirement?.payment_amount 
      ? parseFloat(requirement.payment_amount) 
      : (requirement?.salary_range_max ? parseFloat(requirement.salary_range_max) : 500);

    // Prepare job data for payment
    const jobData = {
      application_id: applicationId,
      job_requirement_id: requirement?.id,
      doctor_id: application.doctor?.id,
      department_id: requirement?.department_id,
      work_type: requirement?.work_type || 'full-time',
      required_sessions: requirement?.required_sessions || 1,
      work_required_date: requirement?.work_required_date,
      start_time: requirement?.start_time,
      end_time: requirement?.end_time,
      duration_hours: requirement?.duration_hours || 1,
      description: requirement?.description,
      location_name: requirement?.location_name,
      address: requirement?.address,
      latitude: requirement?.latitude,
      longitude: requirement?.longitude,
      payment_amount: amount,
      // effective_rate is what we'll use for calculations
      effective_rate: amount,
    };

    // Store pending application ID and show payment modal
    setPendingApplicationId(applicationId);
    setPaymentAmount(amount);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (jobRequirement: any) => {
    setShowPaymentModal(false);
    
    // Now perform the actual acceptance
    if (pendingApplicationId) {
      performAccept(pendingApplicationId);
    }
    
    setPendingApplicationId(null);
    setPaymentAmount(0);
  };

  const handlePaymentFailure = (error: string) => {
    setShowPaymentModal(false);
    Alert.alert('Payment Failed', error || 'Payment could not be completed. Please try again.');
    setPendingApplicationId(null);
    setPaymentAmount(0);
  };

  const performAccept = async (applicationId: number) => {
    console.log('🔵 performAccept called for application:', applicationId);
    
    if (processingId !== null) {
      console.log('⚠️ Already processing another application');
      return;
    }
    
    setProcessingId(applicationId);
    setProcessingAction('accept');
    try {
      console.log('📤 Making PUT request to:', `/hospital/applications/${applicationId}/status`);
      const response = await API.put(`/hospital/applications/${applicationId}/status`, {
        status: 'selected',
      });
      
      console.log('✅ Accept response status:', response.status);
      console.log('✅ Accept response data:', JSON.stringify(response.data, null, 2));
      
      // Update local state immediately for instant feedback
      setApplications(prev => {
        const updated = prev.map(app => {
          if (app.id === applicationId) {
            console.log('🔄 Updating status from', app.status, 'to selected for app:', app.id);
            return { ...app, status: 'selected' };
          }
          return app;
        });
        console.log('📋 Updated applications state:', updated.map(a => ({ id: a.id, status: a.status })));
        return updated;
      });
      
      // Reload applications to get fresh data from server
      setTimeout(() => {
        loadApplications(false);
      }, 1000);
      
      // Show success message
      setTimeout(() => {
        Alert.alert(
          'Doctor Accepted Successfully',
          'Payment has been held in escrow. The full payment will be transferred to the doctor only after work completion and your approval.',
          [{ text: 'OK' }]
        );
      }, 300);
      
    } catch (error: any) {
      console.error('❌ Accept error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      Alert.alert(
        'Error', 
        error.response?.data?.message || error.message || 'Failed to accept application'
      );
    } finally {
      setProcessingId(null);
      console.log('🔵 Processing completed, processingId reset');
      setProcessingAction(null);
    }
  };

  const handleReject = async (applicationId: number, doctorName: string) => {
    console.log('🔴 handleReject called for application:', applicationId);
    // Call performReject directly without confirmation for now
    performReject(applicationId);
  };

  const performReject = async (applicationId: number) => {
    console.log('🔴 performReject called for application:', applicationId);
    
    if (processingId !== null) {
      console.log('⚠️ Already processing another application');
      return;
    }
    
    setProcessingId(applicationId);
    setProcessingAction('reject');
    try {
      console.log('📤 Making PUT request to:', `/hospital/applications/${applicationId}/status`);
      const response = await API.put(`/hospital/applications/${applicationId}/status`, {
        status: 'rejected',
      });
      
      console.log('✅ Reject response status:', response.status);
      console.log('✅ Reject response data:', JSON.stringify(response.data, null, 2));
      
      // Update local state immediately for instant feedback
      setApplications(prev => {
        const updated = prev.map(app => {
          if (app.id === applicationId) {
            console.log('🔄 Updating status from', app.status, 'to rejected for app:', app.id);
            return { ...app, status: 'rejected' };
          }
          return app;
        });
        console.log('📋 Updated applications state:', updated.map(a => ({ id: a.id, status: a.status })));
        return updated;
      });
      
      // Reload applications to get fresh data from server
      setTimeout(() => {
        loadApplications(false);
      }, 1000);
      
      // Show success message
      setTimeout(() => {
        Alert.alert('Success', 'Application rejected');
      }, 300);
      
    } catch (error: any) {
      console.error('❌ Reject error:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);
      Alert.alert(
        'Error', 
        error.response?.data?.message || error.message || 'Failed to reject application'
      );
    } finally {
      setProcessingId(null);
      console.log('🔴 Processing completed, processingId reset');
      setProcessingAction(null);
    }
  };

  const renderStars = (rating: number, totalRatings: number = 0) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    return (
      <View style={styles.starsContainer}>
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} size={14} color="#FFB800" fill="#FFB800" />;
          } else if (i === fullStars && hasHalfStar) {
            return <Star key={i} size={14} color="#FFB800" fill="#FFB800" style={{ opacity: 0.5 }} />;
          } else {
            return <Star key={i} size={14} color="#E5E7EB" fill="transparent" />;
          }
        })}
        <Text style={styles.ratingText}>
          {rating > 0 ? rating.toFixed(1) : 'No ratings'}
        </Text>
        {rating > 0 && totalRatings > 0 && (
          <Text style={styles.ratingCount}>
            ({totalRatings})
          </Text>
        )}
      </View>
    );
  };

  const toggleComparisonSelection = (applicationId: number) => {
    setSelectedForComparison(prev => {
      const newSet = new Set(prev);
      if (newSet.has(applicationId)) {
        newSet.delete(applicationId);
      } else {
        newSet.add(applicationId);
      }
      return newSet;
    });
  };

  const getSelectedApplications = () => {
    return applications.filter(app => selectedForComparison.has(app.id));
  };

  const handleCompare = () => {
    const selected = getSelectedApplications();
    if (selected.length >= 2) {
      setShowComparisonModal(true);
    } else {
      Alert.alert('Select Doctors', 'Please select at least 2 doctors to compare.');
    }
  };

  if (loading) {
    return (
      <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                // Navigate to dashboard tab
                router.push('/hospital/dashboard');
              }
            }} 
            style={styles.backButton}
          >
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Applications</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PrimaryColors.main} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PrimaryColors.dark} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push('/hospital/dashboard');
            }
          }} 
          style={styles.backButton}
        >
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {requirement?.department || 'Cardiology'} Applicants
          </Text>
          <Text style={styles.headerSubtitle}>
            {hospital?.name || 'ST. JUDE MEDICAL CENTER'}
          </Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Search size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Job Post Info */}
      {requirement && (
        <View style={styles.jobPostInfo}>
          <Text style={styles.jobPostTitle}>JOB POST: {requirement.department?.toUpperCase() || 'SENIOR CARDIOLOGIST'}</Text>
          <Text style={styles.applicantCount}>{applications.length} Applicants</Text>
        </View>
      )}

      {/* Applications List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {applications.length === 0 ? (
          <View style={styles.emptyState}>
            <User size={48} color={NeutralColors.textTertiary} />
            <Text style={styles.emptyText}>No applications yet</Text>
            <Text style={styles.emptySubtext}>Doctors can apply to this job requirement</Text>
          </View>
        ) : (
          applications.map((application) => {
            // Debug log to see application status when rendering
            if (__DEV__) {
              console.log(`🎨 Rendering application ${application.id}: status = "${application.status}"`);
            }
            const isSelected = selectedForComparison.has(application.id);
            return (
            <View 
              key={application.id} 
              style={[styles.applicationCard, isSelected && styles.applicationCardSelected]}
            >
              {/* Checkbox */}
              <TouchableOpacity
                style={styles.comparisonCheckbox}
                onPress={() => toggleComparisonSelection(application.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <CheckCircle size={16} color="#fff" fill="#fff" />}
                </View>
              </TouchableOpacity>

              {/* Profile Picture */}
              <Image
                source={{
                  uri: getFullImageUrl(application.doctor?.profile_photo),
                }}
                style={styles.doctorImage}
              />

              {/* Doctor Info */}
              <View style={styles.doctorInfoSection}>
                <View style={styles.nameRow}>
                  <Text style={styles.doctorName}>
                    {application.doctor?.name || 'Doctor'}
                  </Text>
                  {application.status === 'selected' && (
                    <View style={styles.selectedBadge}>
                      <Text style={styles.selectedBadgeText}>(Selected)</Text>
                    </View>
                  )}
                  {(application.status === 'pending' || !application.status) && (
                    <View style={styles.newBadge}>
                      <Text style={styles.newBadgeText}>NEW</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.specialtyText}>
                  {application.doctor?.departments?.[0]?.name || 
                   application.doctor?.departments?.[0]?.department?.name ||
                   application.doctor?.specialization || 
                   'Not specified'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>
                    {application.doctor?.experience || 'N/A'}+ Years
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.educationText}>
                    {application.doctor?.qualifications || 'MD, Medical School'}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={styles.profileLink}
                  onPress={() => {
                    if (application.doctor?.id) {
                      router.push(`/hospital/doctor-profile/${application.doctor.id}`);
                    }
                  }}
                >
                  <Text style={styles.profileLinkText}>Profile</Text>
                  <ExternalLink size={14} color={PrimaryColors.main} />
                </TouchableOpacity>

                {/* Accept/Reject Buttons - Only show for pending applications */}
                {(application.status === 'pending' || !application.status) && (
                  <View style={styles.cardActionButtons}>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.cardRejectButton]}
                      onPress={() => {
                        Alert.alert(
                          'Reject Application',
                          `Are you sure you want to reject ${application.doctor?.name || 'this doctor'}'s application?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Reject',
                              style: 'destructive',
                              onPress: () => handleReject(application.id, application.doctor?.name || 'this doctor'),
                            },
                          ]
                        );
                      }}
                      disabled={processingId !== null && processingId !== application.id}
                    >
                      {processingId === application.id && processingAction === 'reject' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <XCircle size={16} color="#fff" />
                          <Text style={styles.cardRejectButtonText}>Reject</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardActionButton, styles.cardAcceptButton]}
                      onPress={() => handleAccept(application.id, application.doctor?.name || 'this doctor')}
                      disabled={processingId !== null && processingId !== application.id}
                    >
                      {processingId === application.id && processingAction === 'accept' ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <CheckCircle size={16} color="#fff" />
                          <Text style={styles.cardAcceptButtonText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
            );
          })
        )}
      </ScrollView>

      {/* Application Details Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Application Details</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedApplication && (
              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={true}>
                {/* Doctor Info */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <User size={20} color={PrimaryColors.main} />
                    <Text style={styles.modalSectionTitle}>Doctor Information</Text>
                  </View>
                  <View style={styles.modalDoctorCard}>
                    <Image
                      source={{
                        uri: getFullImageUrl(selectedApplication.doctor?.profile_photo),
                      }}
                      style={styles.modalDoctorImage}
                    />
                    <View style={styles.modalDoctorDetails}>
                      <Text style={styles.modalDoctorName}>
                        {selectedApplication.doctor?.name || 'Doctor'}
                      </Text>
                      <Text style={styles.modalDoctorEmail}>
                        {selectedApplication.doctor?.email || 'N/A'}
                      </Text>
                      <Text style={styles.modalDoctorPhone}>
                        {selectedApplication.doctor?.phone_number || 'N/A'}
                      </Text>
                      {selectedApplication.doctor?.current_location && (
                        <View style={styles.modalLocationRow}>
                          <MapPin size={14} color={NeutralColors.textSecondary} />
                          <Text style={styles.modalLocationText}>
                            {selectedApplication.doctor.current_location}
                          </Text>
                        </View>
                      )}
                      {selectedApplication.doctor?.qualifications && (
                        <Text style={styles.modalQualification}>
                          {selectedApplication.doctor.qualifications}
                        </Text>
                      )}
                      {selectedApplication.doctor?.department && (
                        <View style={styles.modalDepartments}>
                          <View style={styles.modalDepartmentBadge}>
                            <Text style={styles.modalDepartmentText}>
                              {selectedApplication.doctor.department.name || selectedApplication.doctor.department}
                            </Text>
                          </View>
                        </View>
                      )}
                      {renderStars(selectedApplication.doctor?.average_rating || 0, selectedApplication.doctor?.total_ratings || 0)}
                    </View>
                  </View>
                </View>

                {/* Application Details */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Calendar size={20} color={PrimaryColors.main} />
                    <Text style={styles.modalSectionTitle}>Application Details</Text>
                  </View>
                  <View style={styles.modalDetailsList}>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Status:</Text>
                      <View style={[styles.modalStatusBadge, { backgroundColor: `${getStatusColor(selectedApplication.status || 'pending')}20` }]}>
                        {getStatusIcon(selectedApplication.status || 'pending')}
                        <Text style={[styles.modalStatusText, { color: getStatusColor(selectedApplication.status || 'pending') }]}>
                          {getStatusText(selectedApplication.status || 'pending')}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.modalDetailRow}>
                      <Text style={styles.modalDetailLabel}>Applied Date:</Text>
                      <Text style={styles.modalDetailValue}>
                        {formatISTDateTimeLong(selectedApplication.created_at)}
                      </Text>
                    </View>
                    {selectedApplication.proposed_rate && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Proposed Rate:</Text>
                        <Text style={styles.modalDetailValue}>
                          ₹{selectedApplication.proposed_rate.toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {selectedApplication.available_date && (
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Available Date:</Text>
                        <Text style={styles.modalDetailValue}>
                          {formatISTDateTimeLong(selectedApplication.available_date)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Cover Letter */}
                {selectedApplication.cover_letter && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Text style={styles.modalSectionTitle}>Cover Letter</Text>
                    </View>
                    <Text style={styles.modalCoverLetter}>
                      {selectedApplication.cover_letter}
                    </Text>
                  </View>
                )}

                {/* Job Requirement Details */}
                {requirement && (
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Building2 size={20} color={PrimaryColors.main} />
                      <Text style={styles.modalSectionTitle}>Job Requirement</Text>
                    </View>
                    <View style={styles.modalDetailsList}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Department:</Text>
                        <Text style={styles.modalDetailValue}>{requirement.department}</Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Work Type:</Text>
                        <Text style={styles.modalDetailValue}>{requirement.work_type}</Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Sessions:</Text>
                        <Text style={styles.modalDetailValue}>{requirement.required_sessions}</Text>
                      </View>
                      {requirement.work_required_date && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Work Date:</Text>
                          <Text style={styles.modalDetailValue}>
                            {formatISTDateTimeLong(requirement.work_required_date)}
                          </Text>
                        </View>
                      )}
                      {requirement.address && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Location:</Text>
                          <Text style={styles.modalDetailValue}>{requirement.address}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                {(selectedApplication.status === 'pending' || !selectedApplication.status) && (
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalRejectButton]}
                      onPress={() => {
                        setModalVisible(false);
                        setTimeout(() => {
                          handleReject(selectedApplication.id, selectedApplication.doctor?.name || 'this doctor');
                        }, 300);
                      }}
                      disabled={processingId !== null}
                    >
                      <XCircle size={18} color="#fff" />
                      <Text style={styles.modalRejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalActionButton, styles.modalAcceptButton]}
                      onPress={() => {
                        setModalVisible(false);
                        setTimeout(() => {
                          handleAccept(selectedApplication.id, selectedApplication.doctor?.name || 'this doctor');
                        }, 300);
                      }}
                      disabled={processingId !== null}
                    >
                      <CheckCircle size={18} color="#fff" />
                      <Text style={styles.modalAcceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      {requirement && (
        <RazorpayPaymentWidget
          visible={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingApplicationId(null);
            setPaymentAmount(0);
          }}
          amount={paymentAmount}
          jobData={{
            application_id: pendingApplicationId,
            job_requirement_id: requirement.id,
            department_id: requirement.department_id,
            work_type: requirement.work_type,
            required_sessions: requirement.required_sessions,
            work_required_date: requirement.work_required_date,
            start_time: requirement.start_time,
            end_time: requirement.end_time,
            duration_hours: requirement.duration_hours,
            description: requirement.description,
            location_name: requirement.location_name,
            address: requirement.address,
            latitude: requirement.latitude,
            longitude: requirement.longitude,
            salary_range_max: paymentAmount,
          }}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
        />
      )}

      {/* Floating Action Button for Comparison */}
      {selectedForComparison.size >= 2 && (
        <TouchableOpacity 
          style={styles.floatingCompareButton}
          onPress={() => {
            router.push({
              pathname: '/hospital/applications/compare',
              params: {
                requirementId: requirementId,
                applicationIds: Array.from(selectedForComparison).join(',')
              }
            });
          }}
        >
          <View style={styles.floatingCompareBadge}>
            <Text style={styles.floatingCompareBadgeText}>{selectedForComparison.size}</Text>
          </View>
          <Text style={styles.floatingCompareButtonText}>Compare Candidates</Text>
          <BarChart3 size={20} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Comparison Modal */}
      <Modal
        visible={showComparisonModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowComparisonModal(false)}
      >
        <View style={styles.comparisonModalOverlay}>
          <View style={styles.comparisonModalContent}>
            <View style={styles.comparisonModalHeader}>
              <Text style={styles.comparisonModalTitle}>Compare Doctors</Text>
              <TouchableOpacity
                onPress={() => setShowComparisonModal(false)}
                style={styles.comparisonModalClose}
              >
                <X size={24} color={NeutralColors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.comparisonScrollView} showsVerticalScrollIndicator={true}>
              {getSelectedApplications().map((app) => (
                <View key={app.id} style={styles.comparisonCard}>
                  <View style={styles.comparisonCardHeader}>
                    <Image
                      source={{ uri: getFullImageUrl(app.doctor?.profile_photo) }}
                      style={styles.comparisonDoctorImage}
                    />
                    <View style={styles.comparisonDoctorInfo}>
                      <Text style={styles.comparisonDoctorName}>
                        {app.doctor?.name || 'Doctor'}
                      </Text>
                      <Text style={styles.comparisonDoctorSpecialization}>
                        {app.doctor?.specialization || 'Not specified'}
                      </Text>
                      {renderStars(app.doctor?.average_rating || 0, app.doctor?.total_ratings || 0)}
                    </View>
                  </View>
                  <View style={styles.comparisonDetails}>
                    <View style={styles.comparisonDetailRow}>
                      <Text style={styles.comparisonDetailLabel}>Experience:</Text>
                      <Text style={styles.comparisonDetailValue}>
                        {app.doctor?.experience || 'N/A'} years
                      </Text>
                    </View>
                    <View style={styles.comparisonDetailRow}>
                      <Text style={styles.comparisonDetailLabel}>Rating:</Text>
                      <Text style={styles.comparisonDetailValue}>
                        {app.doctor?.average_rating ? `${app.doctor.average_rating.toFixed(1)}/5` : 'No ratings'}
                      </Text>
                    </View>
                    <View style={styles.comparisonDetailRow}>
                      <Text style={styles.comparisonDetailLabel}>Total Ratings:</Text>
                      <Text style={styles.comparisonDetailValue}>
                        {app.doctor?.total_ratings || 0}
                      </Text>
                    </View>
                    {app.proposed_rate && (
                      <View style={styles.comparisonDetailRow}>
                        <Text style={styles.comparisonDetailLabel}>Proposed Rate:</Text>
                        <Text style={styles.comparisonDetailValue}>
                          ₹{app.proposed_rate.toLocaleString()}
                        </Text>
                      </View>
                    )}
                    {app.doctor?.current_location && (
                      <View style={styles.comparisonDetailRow}>
                        <Text style={styles.comparisonDetailLabel}>Location:</Text>
                        <Text style={styles.comparisonDetailValue} numberOfLines={1}>
                          {app.doctor.current_location}
                        </Text>
                      </View>
                    )}
                    {app.available_date && (
                      <View style={styles.comparisonDetailRow}>
                        <Text style={styles.comparisonDetailLabel}>Available:</Text>
                        <Text style={styles.comparisonDetailValue}>
                          {new Date(app.available_date).toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.comparisonDetailRow}>
                      <Text style={styles.comparisonDetailLabel}>Applied:</Text>
                      <Text style={styles.comparisonDetailValue}>
                        {formatISTDateTime(app.created_at)}
                      </Text>
                    </View>
                    {app.cover_letter && (
                      <View style={styles.comparisonCoverLetter}>
                        <Text style={styles.comparisonCoverLetterLabel}>Cover Letter:</Text>
                        <Text style={styles.comparisonCoverLetterText} numberOfLines={3}>
                          {app.cover_letter}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.comparisonModalActions}>
              <TouchableOpacity
                style={styles.comparisonClearButton}
                onPress={() => {
                  setSelectedForComparison(new Set());
                  setShowComparisonModal(false);
                }}
              >
                <Text style={styles.comparisonClearButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: PrimaryColors.dark,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jobPostInfo: {
    backgroundColor: PrimaryColors.dark,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  jobPostTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  applicantCount: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  headerOld: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    backgroundColor: PrimaryColors.dark,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  requirementCard: {
    backgroundColor: NeutralColors.cardBackground,
    margin: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  requirementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  requirementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  requirementDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  applicationsCount: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  applicationsCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 120,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  applicationCard: {
    backgroundColor: NeutralColors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  applicationCardSelected: {
    borderWidth: 2,
    borderColor: PrimaryColors.main,
  },
  applicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  doctorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  doctorImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: NeutralColors.border,
    overflow: 'hidden',
  },
  doctorInfoSection: {
    flex: 1,
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  newBadge: {
    backgroundColor: StatusColors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  selectedBadge: {
    backgroundColor: PrimaryColors.main,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  specialtyText: {
    fontSize: 14,
    fontWeight: '500',
    color: PrimaryColors.main,
    marginTop: 2,
  },
  infoRow: {
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
  },
  educationText: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    fontStyle: 'italic',
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  profileLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  cardActionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  cardAcceptButton: {
    backgroundColor: StatusColors.success,
  },
  cardRejectButton: {
    backgroundColor: StatusColors.error,
  },
  cardAcceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  cardRejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  doctorDetails: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  doctorSpecialization: {
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  coverLetterSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  coverLetterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 6,
  },
  coverLetterText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
  },
  applicationDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginLeft: 6,
  },
  ratingCount: {
    fontSize: 11,
    color: NeutralColors.textTertiary,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  acceptButton: {
    backgroundColor: StatusColors.success,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: StatusColors.error,
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: NeutralColors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: NeutralColors.border,
  },
  modalCloseText: {
    fontSize: 20,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  modalDoctorCard: {
    flexDirection: 'row',
    gap: 16,
  },
  modalDoctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  modalDoctorDetails: {
    flex: 1,
    gap: 4,
  },
  modalDoctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  modalDoctorEmail: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  modalDoctorPhone: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
  },
  modalLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  modalLocationText: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
  },
  modalQualification: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    marginTop: 4,
    fontWeight: '500',
  },
  modalDepartments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  modalDepartmentBadge: {
    backgroundColor: `${PrimaryColors.main}15`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalDepartmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: PrimaryColors.main,
  },
  modalDetailsList: {
    gap: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  modalDetailValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  modalStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalCoverLetter: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 12,
  },
  modalActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  modalRejectButton: {
    backgroundColor: StatusColors.error,
  },
  modalAcceptButton: {
    backgroundColor: StatusColors.success,
  },
  modalRejectButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  modalAcceptButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Comparison styles
  compareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  compareButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  applicationCardSelected: {
    borderWidth: 2,
    borderColor: PrimaryColors.main,
    backgroundColor: `${PrimaryColors.main}08`,
  },
  comparisonCheckbox: {
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: NeutralColors.border,
    backgroundColor: NeutralColors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: PrimaryColors.main,
    borderColor: PrimaryColors.main,
  },
  floatingCompareButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: PrimaryColors.main,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
    zIndex: 1000,
  },
  floatingCompareBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCompareBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: PrimaryColors.main,
  },
  floatingCompareButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
  },
  comparisonModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  comparisonModalContent: {
    backgroundColor: NeutralColors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  comparisonModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.border,
  },
  comparisonModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: PrimaryColors.dark,
  },
  comparisonModalClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: NeutralColors.border,
  },
  comparisonScrollView: {
    maxHeight: '100%',
  },
  comparisonCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  comparisonCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.divider,
  },
  comparisonDoctorImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  comparisonDoctorInfo: {
    flex: 1,
  },
  comparisonDoctorName: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  comparisonDoctorSpecialization: {
    fontSize: 14,
    color: PrimaryColors.main,
    fontWeight: '500',
    marginBottom: 6,
  },
  comparisonDetails: {
    gap: 10,
  },
  comparisonDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  comparisonDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textSecondary,
    flex: 1,
  },
  comparisonDetailValue: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  comparisonCoverLetter: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.divider,
  },
  comparisonCoverLetterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: NeutralColors.textPrimary,
    marginBottom: 6,
  },
  comparisonCoverLetterText: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    lineHeight: 18,
  },
  comparisonModalActions: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NeutralColors.border,
  },
  comparisonClearButton: {
    backgroundColor: NeutralColors.border,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  comparisonClearButtonText: {
    color: NeutralColors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

