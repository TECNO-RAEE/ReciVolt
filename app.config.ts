import type { ConfigContext, ExpoConfig } from 'expo/config';
import staticConfig from './app.json';
import brand from './src/config/brand.json';

export default function appConfig({ config }: ConfigContext): ExpoConfig {
  return {
    ...config,
    name: brand.name,
    slug: config.slug ?? staticConfig.expo.slug,
    extra: {
      ...config.extra,
      hasGoogleMapsKey: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY),
    },
    plugins: [
      ...(config.plugins ?? []),
      './plugins/withProguardKeepRules',
      [
        'expo-location',
        {
          locationWhenInUsePermission: `${brand.name} usa tu ubicación para encontrar puntos verdes cercanos.`,
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: `${brand.name} usa la cámara para escanear códigos de entregas.`,
          microphonePermission: false,
          recordAudioAndroid: false,
          barcodeScannerEnabled: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: `${brand.name} permite adjuntar una foto de los dispositivos que vas a entregar.`,
          cameraPermission: `${brand.name} usa la cámara para escanear códigos de entregas.`,
          microphonePermission: false,
        },
      ],
      [
        'react-native-maps',
        {
          ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY
            ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }
            : {}),
        },
      ],
    ],
  };
}
