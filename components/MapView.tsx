// Platform-specific MapView component
// Metro bundler will automatically resolve .native.tsx or .web.tsx based on platform
import { MapViewComponent as NativeMapViewComponent } from './MapView.native';
import { MapViewComponent as WebMapViewComponent } from './MapView.web';
import { Platform } from 'react-native';

export const MapViewComponent = Platform.OS === 'web' ? WebMapViewComponent : NativeMapViewComponent;

