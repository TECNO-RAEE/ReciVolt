import { Stack } from 'expo-router';

import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/providers/AuthProvider';

export default function AuthLayout() {
  const { session, recoveringPassword } = useAuth();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        header: ({ options }) => <ScreenHeader title={options.title ?? ''} back="/" />,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: 'Iniciar sesión' }} />
      <Stack.Screen name="register" options={{ title: 'Crear cuenta' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Recuperar contraseña' }} />
      <Stack.Protected guard={Boolean(session) && recoveringPassword}>
        <Stack.Screen name="new-password" options={{ title: 'Nueva contraseña' }} />
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
