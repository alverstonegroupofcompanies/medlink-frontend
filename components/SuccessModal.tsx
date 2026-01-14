import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { HospitalDesignColors, Spacing, BorderRadius, Elevation, Typography } from '@/constants/hospital-design';

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  buttonText?: string;
}

/**
 * Material Design 3 success modal component
 * White box modal with elevation for success messages
 */
export function SuccessModal({
  visible,
  title = 'Success',
  message = 'Operation completed successfully',
  onClose,
  buttonText = 'OK',
}: SuccessModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <CheckCircle size={48} color={HospitalDesignColors.success} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
          
          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: HospitalDesignColors.surface,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Elevation.level8,
  },
  iconContainer: {
    marginBottom: Spacing.md,
  },
  title: {
    ...Typography.h3,
    color: HospitalDesignColors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    ...Typography.body1,
    color: HospitalDesignColors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: HospitalDesignColors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    ...Elevation.level2,
  },
  buttonText: {
    ...Typography.button,
    color: HospitalDesignColors.onPrimary,
  },
});
