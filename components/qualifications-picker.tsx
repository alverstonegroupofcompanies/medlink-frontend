import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { getQualifications, MEDICAL_QUALIFICATIONS } from '@/utils/qualifications';
import { DoctorPrimaryColors as PrimaryColors } from '@/constants/doctor-theme';

interface QualificationsPickerProps {
  value: string;
  onValueChange: (qualification: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function QualificationsPicker({
  value,
  onValueChange,
  placeholder = 'Select Qualification',
  error,
  required = false,
}: QualificationsPickerProps) {
  const [qualifications, setQualifications] = useState<string[]>(MEDICAL_QUALIFICATIONS);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    loadQualifications();
  }, []);

  const loadQualifications = async () => {
    try {
      setLoading(true);
      const quals = await getQualifications();
      if (quals && Array.isArray(quals) && quals.length > 0) {
        setQualifications(quals);
        if (__DEV__) {
          console.log('✅ Qualifications loaded:', quals.length);
        }
      } else {
        if (__DEV__) {
          console.warn('⚠️ No qualifications returned, using defaults');
        }
        setQualifications(MEDICAL_QUALIFICATIONS);
      }
    } catch (error) {
      if (__DEV__) {
        console.error('❌ Error loading qualifications:', error);
      }
      setQualifications(MEDICAL_QUALIFICATIONS);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (qualification: string) => {
    onValueChange(qualification);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          !value && styles.pickerPlaceholder,
        ]}
        onPress={() => {
          // Reload qualifications when opening modal to ensure fresh data
          loadQualifications();
          setModalVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            !value && styles.pickerTextPlaceholder,
          ]}
        >
          {value || placeholder}
          {required && !value && ' *'}
        </Text>
        <ChevronDown size={20} color={value ? '#1E293B' : '#94A3B8'} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Qualification</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading qualifications...</Text>
              </View>
            ) : qualifications.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>No qualifications available</Text>
              </View>
            ) : (
              <FlatList
                data={qualifications}
                keyExtractor={(item, index) => `${item}-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.qualificationItem,
                      value === item && styles.qualificationItemSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.qualificationName,
                        value === item && styles.qualificationNameSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                )}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={true}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minHeight: 52,
  },
  pickerPlaceholder: {
    borderColor: '#E2E8F0',
  },
  pickerError: {
    borderColor: '#DC2626',
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  pickerTextPlaceholder: {
    color: '#94A3B8',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    minHeight: 300,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  closeButtonText: {
    fontSize: 16,
    color: PrimaryColors.main,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  list: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  qualificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  qualificationItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  qualificationName: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '500',
  },
  qualificationNameSelected: {
    color: PrimaryColors.main,
    fontWeight: '600',
  },
});
