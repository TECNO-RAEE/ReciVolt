import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { useColors } from '@/theme';

export default function AdminLayout() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reducedMotion ? 'fade' : 'default',
      }}
    />
  );
}
