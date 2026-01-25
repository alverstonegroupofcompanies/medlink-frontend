// Uber-ish light map style for Google Maps (react-native-maps customMapStyle)
// Tweaked for clean roads, softer POIs, and better contrast for markers/routes.
export const UBER_LIKE_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#F5F7FA' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5A6472' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F7FA' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#DDE3EA' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#EEF2F6' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#7A8699' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DFF3E5' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#DDE3EA' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#6B7280' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#E9EEF5' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#DDE3EA' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#E8EDF3' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#CFE8FF' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4B6A88' }] },
];

