/** Estilo oscuro para Google Maps (Android). En iOS se usa `userInterfaceStyle`. */
export const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#1d2a24' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9db3a8' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#14201b' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#33453c' }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f3a2b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2b3b33' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8aa095' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3a5246' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1c2a' }] },
];
