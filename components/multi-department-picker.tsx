import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform, ScrollView } from 'react-native';
import { ChevronDown, X, Check } from 'lucide-react-native';
import API from '../app/api';
import { ModernColors, Spacing, BorderRadius, Typography } from '@/constants/modern-theme';

interface Department {
  id: number;
  name: string;
  description?: string;
}

interface MultiDepartmentPickerProps {
  selectedIds: number[];
  onValuesChange: (departmentIds: number[]) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function MultiDepartmentPicker({
  selectedIds,
  onValuesChange,
  placeholder = 'Select Departments',
  error,
  required = false,
}: MultiDepartmentPickerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  
  useEffect(() => {
    loadDepartments();
  }, []);

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

  const toggleSelection = (departmentId: number) => {
    if (selectedIds.includes(departmentId)) {
      onValuesChange(selectedIds.filter(id => id !== departmentId));
    } else {
      onValuesChange([...selectedIds, departmentId]);
    }
  };

  const removeDepartment = (departmentId: number) => {
    onValuesChange(selectedIds.filter(id => id !== departmentId));
  };

  const getSelectedDepartmentNames = () => {
    return departments
      .filter(d => selectedIds.includes(d.id))
      .map(d => d.name);
  };

  return (
    <View style={styles.container}>
      {/* Selected Tags Display */}
      {selectedIds.length > 0 && (
        <View style={styles.tagsContainer}>
          {departments
            .filter(d => selectedIds.includes(d.id))
            .map(department => (
              <View key={department.id} style={styles.tag}>
                <Text style={styles.tagText}>{department.name}</Text>
                <TouchableOpacity onPress={() => removeDepartment(department.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={14} color={ModernColors.primary.main} />
                </TouchableOpacity>
              </View>
            ))}
        </View>
      )}

      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          selectedIds.length === 0 && styles.pickerPlaceholder,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            selectedIds.length === 0 && styles.pickerTextPlaceholder,
          ]}
        >
          {selectedIds.length > 0 
            ? `${selectedIds.length} Department${selectedIds.length > 1 ? 's' : ''} Selected` 
            : placeholder}
          {required && selectedIds.length === 0 && ' *'}
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
              <Text style={styles.modalTitle}>Select Departments</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Done</Text>
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
                renderItem={({ item }) => {
                    const isSelected = selectedIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        style={[
                          styles.departmentItem,
                          isSelected && styles.departmentItemSelected,
                        ]}
                        onPress={() => toggleSelection(item.id)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.departmentName,
                              isSelected && styles.departmentNameSelected,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.description && (
                            <Text style={styles.departmentDescription}>{item.description}</Text>
                          )}
                        </View>
                        {isSelected && (
                          <Check size={20} color={ModernColors.primary.main} />
                        )}
                      </TouchableOpacity>
                    );
                }}
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
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ModernColors.primary.light,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    ...Typography.captionBold,
    color: ModernColors.primary.main,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
