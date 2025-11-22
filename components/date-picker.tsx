import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { ChevronDown, Calendar } from 'lucide-react-native';
import { ModernColors, Spacing, BorderRadius, Typography } from '@/constants/modern-theme';

interface DatePickerProps {
  value: string; // YYYY-MM-DD format
  onValueChange: (date: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  minimumDate?: Date;
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = 'Select Date',
  error,
  required = false,
  minimumDate,
}: DatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value) : null
  );

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onValueChange(formatDate(date));
    setModalVisible(false);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const minDate = minimumDate || today;
    const currentDate = selectedDate || today;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return days;
  };

  const [currentMonth, setCurrentMonth] = useState(
    selectedDate || new Date()
  );

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentMonth);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentMonth(newDate);
  };

  const isDateDisabled = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const minDate = minimumDate || today;
    minDate.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < minDate;
  };

  const isDateSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const calendarDays = generateCalendarDays();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.picker,
          error && styles.pickerError,
          !selectedDate && styles.pickerPlaceholder,
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Calendar size={18} color={ModernColors.text.secondary} />
        <Text
          style={[
            styles.pickerText,
            !selectedDate && styles.pickerTextPlaceholder,
          ]}
        >
          {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
          {required && !selectedDate && ' *'}
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
              <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                <Text style={styles.navButtonText}>‹</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{monthName}</Text>
              <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                <Text style={styles.navButtonText}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.calendarHeader}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.dayHeader}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <View key={index} style={styles.dayCell} />;
                }
                const disabled = isDateDisabled(date);
                const selected = isDateSelected(date);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dayCell,
                      selected && styles.dayCellSelected,
                      disabled && styles.dayCellDisabled,
                    ]}
                    onPress={() => !disabled && handleDateSelect(date)}
                    disabled={disabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        disabled && styles.dayTextDisabled,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
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
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  navButton: {
    padding: Spacing.xs,
    minWidth: 40,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: ModernColors.primary.main,
    fontWeight: 'bold',
  },
  modalTitle: {
    ...Typography.h3,
    color: ModernColors.text.primary,
  },
  calendarHeader: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    ...Typography.caption,
    color: ModernColors.text.secondary,
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xs,
  },
  dayCellSelected: {
    backgroundColor: ModernColors.primary.main,
    borderRadius: BorderRadius.sm,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    ...Typography.body,
    color: ModernColors.text.primary,
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: ModernColors.text.tertiary,
  },
  closeButton: {
    padding: Spacing.md,
    alignItems: 'center',
    backgroundColor: ModernColors.primary.main,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  closeButtonText: {
    ...Typography.bodyBold,
    color: '#fff',
  },
});

