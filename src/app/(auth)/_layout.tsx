import { Stack } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/providers/AuthProvider';
import { useColors } from '@/theme';

export default function AuthLayout() {
  const { session, recoveringPassword } = useAuth();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options }) => <ScreenHeader title={options.title ?? ''} back="/" />,
        contentStyle: { backgroundColor: colors.background },
        animation: reducedMotion ? 'fade' : 'default',
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
      <Stack.Screen name="register" options={{ title: 'Crear cuenta' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Recuperar contraseña' }} />
      <Stack.Protected guard={Boolean(session) && recoveringPassword}>
        <Stack.Screen name="new-password" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Screen
        name="welcome"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
