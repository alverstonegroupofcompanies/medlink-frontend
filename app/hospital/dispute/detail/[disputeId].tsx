import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import {
  ArrowLeft,
  AlertCircle,
  Send,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react-native';
import { HospitalPrimaryColors as PrimaryColors, HospitalNeutralColors as NeutralColors } from '@/constants/hospital-theme';
import API from '../../../api';
import { ScreenSafeArea } from '@/components/screen-safe-area';
import { Card, Text, ActivityIndicator, Divider } from 'react-native-paper';

export default function HospitalDisputeDetailScreen() {
  const { disputeId } = useLocalSearchParams<{ disputeId: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dispute, setDispute] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#2563EB', true);
        StatusBar.setTranslucent(false);
        StatusBar.setBarStyle('light-content', true);
      }
      StatusBar.setBarStyle('light-content', true);
      loadDispute();
      return () => {};
    }, [disputeId])
  );

  const loadDispute = async () => {
    try {
      setLoading(true);
      const response = await API.get(`/disputes/${disputeId}`);
      setDispute(response.data.dispute);
      setMessages(response.data.dispute.messages || []);
    } catch (error: any) {
      console.error('Error loading dispute:', error);
      Alert.alert('Error', 'Failed to load dispute details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDispute();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) {
      Alert.alert('Validation Error', 'Please enter a message');
      return;
    }

    if (dispute?.status === 'closed' || dispute?.status === 'resolved') {
      Alert.alert('Dispute Closed', 'This dispute has been closed. You cannot send new messages.');
      return;
    }

    setSending(true);
    try {
      await API.post(`/disputes/${disputeId}/messages`, {
        message: newMessage.trim(),
      });

      setNewMessage('');
      loadDispute();
      
      Alert.alert('Success', 'Message sent successfully');
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'closed':
        return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
      case 'under_review':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      default:
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved':
        return <CheckCircle size={20} color="#15803D" />;
      case 'closed':
        return <XCircle size={20} color="#6B7280" />;
      case 'under_review':
        return <Clock size={20} color="#D97706" />;
      default:
        return <AlertCircle size={20} color="#D97706" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'Resolved';
      case 'closed':
        return 'Closed';
      case 'under_review':
        return 'Under Review';
      case 'rejected':
        return 'Rejected';
      case 'open':
        return 'Open';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PrimaryColors.main} />
      </View>
    );
  }

  if (!dispute) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Dispute not found</Text>
      </View>
    );
  }

  const statusColors = getStatusColor(dispute.status);
  const isClosed = dispute.status === 'closed' || dispute.status === 'resolved';

  return (
    <ScreenSafeArea backgroundColor={PrimaryColors.dark} statusBarStyle="light-content" style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563EB" translucent={false} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dispute #{dispute.id}</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Dispute Info Card */}
          <Card style={styles.infoCard} mode="elevated" elevation={2}>
            <Card.Content>
              <View style={styles.infoHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.disputeTitle}>{dispute.title}</Text>
                  <Text style={styles.disputeType}>
                    Type: {dispute.dispute_type?.charAt(0).toUpperCase() + dispute.dispute_type?.slice(1)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
                  {getStatusIcon(dispute.status)}
                  <Text style={[styles.statusText, { color: statusColors.text }]}>
                    {getStatusLabel(dispute.status)}
                  </Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <Text style={styles.descriptionLabel}>Description:</Text>
              <Text style={styles.descriptionText}>{dispute.description}</Text>

              <Text style={styles.dateText}>
                Created: {new Date(dispute.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>

              {dispute.resolved_at && (
                <Text style={styles.dateText}>
                  Resolved: {new Date(dispute.resolved_at).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              )}

              {dispute.resolution_notes && (
                <>
                  <Divider style={styles.divider} />
                  <Text style={styles.resolutionLabel}>Resolution Notes:</Text>
                  <Text style={styles.resolutionText}>{dispute.resolution_notes}</Text>
                </>
              )}
            </Card.Content>
          </Card>

          {/* Chat / Messages Section */}
          <View style={styles.messagesSection}>
            <Text style={styles.messagesSectionTitle}>Chat</Text>
            
            {messages.length === 0 ? (
              <Card style={styles.noMessagesCard}>
                <Card.Content>
                  <Text style={styles.noMessagesText}>No messages yet. Start the conversation!</Text>
                </Card.Content>
              </Card>
            ) : (
              <ScrollView style={styles.messagesList} nestedScrollEnabled showsVerticalScrollIndicator>
              {messages.map((message: any, index: number) => {
                const isAdmin = message.sender_type === 'admin';
                const isHospital = message.sender_type === 'hospital';
                
                return (
                  <View 
                    key={message.id || index} 
                    style={[
                      styles.messageCard,
                      isAdmin ? styles.adminMessage : styles.userMessage
                    ]}
                  >
                    <View style={styles.messageHeader}>
                      <Text style={[
                        styles.senderName,
                        isAdmin && styles.adminSenderName
                      ]}>
                        {isAdmin ? '🛡️ Support Team' : isHospital ? '🏥 You' : '👨‍⚕️ Doctor'}
                      </Text>
                      <Text style={styles.messageTime}>
                        {new Date(message.created_at).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Text>
                    </View>
                    <Text style={[
                      styles.messageText,
                      isAdmin && styles.adminMessageText
                    ]}>
                      {message.message}
                    </Text>
                    <Text style={styles.messageDate}>
                      {new Date(message.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </Text>
                  </View>
                );
              })}
              </ScrollView>
            )}
          </View>

          {isClosed && (
            <Card style={styles.closedNotice}>
              <Card.Content>
                <View style={styles.closedNoticeContent}>
                  <XCircle size={20} color="#6B7280" />
                  <Text style={styles.closedNoticeText}>
                    This dispute has been {dispute.status}. No new messages can be sent.
                  </Text>
                </View>
              </Card.Content>
            </Card>
          )}
        </ScrollView>

        {/* Message Input (only if not closed) */}
        {!isClosed && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.messageInput}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type your message..."
              placeholderTextColor={NeutralColors.textLight}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={sending || !newMessage.trim()}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
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
  headerContainer: {
    backgroundColor: PrimaryColors.dark,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  disputeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 4,
  },
  disputeType: {
    fontSize: 13,
    color: NeutralColors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  divider: {
    marginVertical: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
    color: NeutralColors.textSecondary,
    marginTop: 4,
  },
  resolutionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#15803D',
    marginBottom: 6,
  },
  resolutionText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  messagesSection: {
    marginBottom: 16,
  },
  messagesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
    marginBottom: 12,
  },
  messagesList: {
    maxHeight: 260,
  },
  noMessagesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  noMessagesText: {
    fontSize: 14,
    color: NeutralColors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  messageCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  adminMessage: {
    backgroundColor: '#EEF2FF',
    borderLeftWidth: 3,
    borderLeftColor: '#6366F1',
  },
  userMessage: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '700',
    color: NeutralColors.textPrimary,
  },
  adminSenderName: {
    color: '#6366F1',
  },
  messageTime: {
    fontSize: 11,
    color: NeutralColors.textSecondary,
  },
  messageText: {
    fontSize: 14,
    color: NeutralColors.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  adminMessageText: {
    color: '#4338CA',
  },
  messageDate: {
    fontSize: 11,
    color: NeutralColors.textSecondary,
  },
  closedNotice: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginTop: 8,
  },
  closedNoticeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  closedNoticeText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: NeutralColors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: NeutralColors.textPrimary,
    backgroundColor: '#F9FAFB',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: PrimaryColors.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
