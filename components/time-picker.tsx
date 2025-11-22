import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList, Platform } from 'react-native';
import { ChevronDown, Clock } from 'lucide-react-native';
import { ModernColors, Spacing, BorderRadius, Typography } from '@/constants/modern-theme';

interface TimePickerProps {
  value: string; // HH:MM format
  onValueChange: (time: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

export function TimePicker({
  value,
  onValueChange,
  placeholder = 'Select Time',
  error,
  required = false,
}: TimePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Generate time slots (every 30 minutes from 00:00 to 23:30)
  const generateTimeSlots = (): string[] => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const formatDisplayTime = (time: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleTimeSelect = (time: string) => {
    onValueChange(time);
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
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Clock size={18} color={ModernColors.text.secondary} />
        <Text
          style={[
            styles.pickerText,
            !value && styles.pickerTextPlaceholder,
          ]}
        >
          {value ? formatDisplayTime(value) : placeholder}
          {required && !value && ' *'}
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
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={timeSlots}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.timeItem,
                    value === item && styles.timeItemSelected,
                  ]}
                  onPress={() => handleTimeSelect(item)}
                >
                  <Text
                    style={[
                      styles.timeText,
                      value === item && styles.timeTextSelected,
                    ]}
                  >
                    {formatDisplayTime(item)}
                  </Text>
                  <Text
                    style={[
                      styles.timeText24,
                      value === item && styles.timeText24Selected,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.list}
              showsVerticalScrollIndicator={true}
            />
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
    gap: Spacing.sm,
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
    maxHeight: '70%',
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
  list: {
    maxHeight: Platform.OS === 'web' ? 400 : 500,
  },
  timeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: ModernColors.border.light,
  },
  timeItemSelected: {
    backgroundColor: ModernColors.primary.light,
  },
  timeText: {
    ...Typography.bodyBold,
    color: ModernColors.text.primary,
  },
  timeTextSelected: {
    color: ModernColors.primary.main,
  },
  timeText24: {
    ...Typography.caption,
    color: ModernColors.text.secondary,
  },
  timeText24Selected: {
    color: ModernColors.primary.main,
  },
});

