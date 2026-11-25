import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';
import { CompanyPortalProvider } from '@/providers/CompanyPortalProvider';
import { useColors } from '@/theme';

export default function CompanyLayout() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  return (
    <CompanyPortalProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: reducedMotion ? 'fade' : 'default',
        }}
      />
    </CompanyPortalProvider>
  );
}
