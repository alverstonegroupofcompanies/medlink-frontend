// Re-export specific implementation based on platform
import { Platform } from 'react-native';

const LiveTrackingMap = Platform.select({
  native: () => require('./LiveTrackingMap.native').LiveTrackingMap,
  default: () => require('./LiveTrackingMap.web').LiveTrackingMap,
})();

export { LiveTrackingMap };
