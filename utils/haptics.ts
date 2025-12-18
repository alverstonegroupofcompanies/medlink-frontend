import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isSupported = Platform.OS !== 'web';

export const HapticFeedback = {
  selection() {
    if (!isSupported) return;
    Haptics.selectionAsync();
  },
  light() {
    if (!isSupported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  },
  medium() {
    if (!isSupported) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  },
  success() {
    if (!isSupported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  },
  error() {
    if (!isSupported) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  },
};

export const useHaptics = () => HapticFeedback;

















