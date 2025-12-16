import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform, TextInput } from 'react-native';
import { ChevronDown, X, Plus } from 'lucide-react-native';
import API from '../app/api';
import { ModernColors, Spacing, BorderRadius, Typography } from '@/constants/modern-theme';

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface SelectedDepartment {
  department_id: number;
  experience?: string;
}

interface MultiDepartmentPickerProps {
  value: SelectedDepartment[];
  onValueChange: (departments: SelectedDepartment[]) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function MultiDepartmentPicker({
  value = [],
  onValueChange,
  placeholder = 'Select Departments',
  error,
  required = false,
}: MultiDepartmentPickerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<SelectedDepartment[]>(value || []);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    setSelectedDepartments(value || []);
  }, [value]);

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

  const handleAddDepartment = (department: Department) => {
    const isAlreadySelected = selectedDepartments.some(
      (dept) => dept.department_id === department.id
    );

    if (!isAlreadySelected) {
      const newSelection = [
        ...selectedDepartments,
        { department_id: department.id, experience: '' },
      ];
      setSelectedDepartments(newSelection);
      onValueChange(newSelection);
    }
    setModalVisible(false);
  };

  const handleRemoveDepartment = (departmentId: number) => {
    const newSelection = selectedDepartments.filter(
      (dept) => dept.department_id !== departmentId
    );
    setSelectedDepartments(newSelection);
    onValueChange(newSelection);
  };

  const handleExperienceChange = (departmentId: number, experience: string) => {
    const newSelection = selectedDepartments.map((dept) =>
      dept.department_id === departmentId
        ? { ...dept, experience }
        : dept
    );
    setSelectedDepartments(newSelection);
    onValueChange(newSelection);
  };

  const getDepartmentName = (departmentId: number) => {
    return departments.find((d) => d.id === departmentId)?.name || 'Unknown';
  };

  const availableDepartments = departments.filter(
    (dept) => !selectedDepartments.some((selected) => selected.department_id === dept.id)
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          selectedDepartments.length === 0 && styles.pickerPlaceholder,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            selectedDepartments.length === 0 && styles.pickerTextPlaceholder,
          ]}
        >
          {selectedDepartments.length > 0
            ? `${selectedDepartments.length} department${selectedDepartments.length > 1 ? 's' : ''} selected`
            : placeholder}
          {required && selectedDepartments.length === 0 && ' *'}
        </Text>
        <ChevronDown size={20} color={ModernColors.text.secondary} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Selected Departments List */}
      {selectedDepartments.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedDepartments.map((dept) => (
            <View key={dept.department_id} style={styles.selectedItem}>
              <View style={styles.selectedItemContent}>
                <Text style={styles.selectedItemName}>
                  {getDepartmentName(dept.department_id)}
                </Text>
                <TextInput
                  style={styles.experienceInput}
                  value={dept.experience || ''}
                  onChangeText={(text) => handleExperienceChange(dept.department_id, text)}
                  placeholder="Experience (optional)"
                  placeholderTextColor={ModernColors.text.tertiary}
                />
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveDepartment(dept.department_id)}
                style={styles.removeButton}
              >
                <X size={16} color={ModernColors.error.main} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Departments</Text>
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
            ) : availableDepartments.length === 0 ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>All departments selected</Text>
              </View>
            ) : (
              <FlatList
                data={availableDepartments}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.departmentItem}
                    onPress={() => handleAddDepartment(item)}
                  >
                    <View style={styles.departmentItemContent}>
                      <Text style={styles.departmentName}>{item.name}</Text>
                      {item.description && (
                        <Text style={styles.departmentDescription}>{item.description}</Text>
                      )}
                    </View>
                    <Plus size={20} color={ModernColors.primary.main} />
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
  selectedContainer: {
    marginTop: Spacing.sm,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ModernColors.background.secondary,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  selectedItemContent: {
    flex: 1,
  },
  selectedItemName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: Spacing.xs,
  },
  experienceInput: {
    ...Typography.body,
    backgroundColor: ModernColors.background.primary,
    borderWidth: 1,
    borderColor: ModernColors.border.light,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    color: ModernColors.text.primary,
  },
  removeButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  departmentItemContent: {
    flex: 1,
  },
  departmentName: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
    marginBottom: Spacing.xs,
  },
  departmentDescription: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
});

