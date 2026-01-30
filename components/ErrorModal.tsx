import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { HospitalDesignColors, Spacing, BorderRadius, Elevation, Typography } from '@/constants/hospital-design';

interface ErrorModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  onClose: () => void;
  buttonText?: string;
  actionButtonText?: string;
  onAction?: () => void;
}

/**
 * Material Design 3 error modal component
 * White box modal with elevation for error messages
 * Supports optional action button (e.g., "Register" for account not found)
 */
export function ErrorModal({
  visible,
  title = 'Error',
  message = 'Something went wrong. Please try again.',
  onClose,
  buttonText = 'OK',
  actionButtonText,
  onAction,
}: ErrorModalProps) {
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
            <AlertCircle size={48} color={HospitalDesignColors.error} />
          </View>
          
          <Text style={styles.title}>{title}</Text>
          
          {message && (
            <Text style={styles.message}>{message}</Text>
          )}
          
          <View style={styles.buttonContainer}>
            {actionButtonText && onAction && (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={onAction}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>{actionButtonText}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.button, actionButtonText ? styles.secondaryButton : styles.primaryButton]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[actionButtonText ? styles.secondaryButtonText : styles.primaryButtonText]}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
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
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  primaryButton: {
    backgroundColor: HospitalDesignColors.primary,
    ...Elevation.level2,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: HospitalDesignColors.border,
  },
  primaryButtonText: {
    ...Typography.button,
    color: HospitalDesignColors.onPrimary,
    fontWeight: '600',
  },
  secondaryButtonText: {
    ...Typography.button,
    color: HospitalDesignColors.onSurface,
  },
});
