import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import API from '../app/api';
import { ModernColors, Spacing, BorderRadius, Typography } from '@/constants/modern-theme';

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface DepartmentPickerProps {
  value: number | null;
  onValueChange: (departmentId: number | null) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function DepartmentPicker({
  value,
  onValueChange,
  placeholder = 'Select Department',
  error,
  required = false,
}: DepartmentPickerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (value && departments.length > 0) {
      const dept = departments.find(d => d.id === value);
      setSelectedDepartment(dept || null);
    } else {
      setSelectedDepartment(null);
    }
  }, [value, departments]);

  const loadDepartments = async () => {
    try {
      const response = await API.get('/departments');
      setDepartments(response.data.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (department: Department) => {
    setSelectedDepartment(department);
    onValueChange(department.id);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          !selectedDepartment && styles.pickerPlaceholder,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            !selectedDepartment && styles.pickerTextPlaceholder,
          ]}
        >
          {selectedDepartment ? selectedDepartment.name : placeholder}
          {required && !selectedDepartment && ' *'}
        </Text>
        <ChevronDown size={20} color={ModernColors.text.secondary} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Department</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading departments...</Text>
              </View>
            ) : (
              <FlatList
                data={departments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.departmentItem,
                      selectedDepartment?.id === item.id && styles.departmentItemSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text
                      style={[
                        styles.departmentName,
                        selectedDepartment?.id === item.id && styles.departmentNameSelected,
                      ]}
                    >
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text style={styles.departmentDescription}>{item.description}</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={styles.list}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ModernColors.background.primary,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  pickerPlaceholder: {
    borderColor: ModernColors.border.medium,
  },
  pickerError: {
    borderColor: ModernColors.error.main,
  },
  pickerText: {
    ...Typography.body,
    color: ModernColors.text.primary,
    flex: 1,
  },
  pickerTextPlaceholder: {
    color: ModernColors.text.tertiary,
  },
  errorText: {
    ...Typography.caption,
    color: ModernColors.error.main,
    marginTop: Spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: ModernColors.background.primary,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
    paddingTop: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  modalTitle: {
    ...Typography.h3,
    color: ModernColors.text.primary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  closeButtonText: {
    ...Typography.bodyBold,
    color: ModernColors.primary.main,
  },
  loadingContainer: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: ModernColors.text.secondary,
  },
  list: {
    maxHeight: Platform.OS === 'web' ? 400 : 500,
  },
  departmentItem: {
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  departmentItemSelected: {
    backgroundColor: ModernColors.primary.light,
  },
  departmentName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: Spacing.xs,
  },
  departmentNameSelected: {
    color: ModernColors.primary.main,
  },
  departmentDescription: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
});

