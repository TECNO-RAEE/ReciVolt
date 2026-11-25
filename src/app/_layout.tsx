import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { ActivityIndicator, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { DiscoveryProvider } from '@/providers/DiscoveryProvider';
import { WalletProvider } from '@/providers/WalletProvider';
import { canAccessCitizen } from '@/models/Access';
import { ThemeProvider, useColorSchemeName, useColors } from '@/theme';
import { useFonts } from 'expo-font';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootShell />
    </ThemeProvider>
  );
}

function RootShell() {
  const scheme = useColorSchemeName();
  const colors = useColors();

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AuthProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />

        <DiscoveryProvider>
          <WalletProvider>
            <Navigation />
          </WalletProvider>
        </DiscoveryProvider>
      </AuthProvider>
    </View>
  );
}

function Navigation() {
  const { session, role, guest, loading, recoveringPassword } = useAuth();
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const [ready, setReady] = useState(false);
  if (!ready && !loading) setReady(true);
  // Delay initial routing, but keep the navigator mounted during later Auth events.
  if (!ready)
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando sesión" />
      </View>
    );
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: reducedMotion ? 'fade' : 'default',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="portal-access" />
      <Stack.Screen name="company-application" />
      <Stack.Screen name="company-invitations" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="contact" />
      <Stack.Protected guard={!session || recoveringPassword}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && !recoveringPassword && canAccessCitizen(role, guest)}>
        <Stack.Screen name="(app)" />
        <Stack.Screen name="my-raee" />
        <Stack.Screen name="device-categories" />
        <Stack.Screen name="device-unaccepted" />
        <Stack.Screen name="point/[id]" />
        <Stack.Screen name="new-delivery" />
        <Stack.Screen name="delivery/[id]" />
        <Stack.Screen name="pickup/new" />
        <Stack.Screen name="pickup/[id]" />
        <Stack.Screen name="impact" />
        <Stack.Screen name="reward/[id]" />
        <Stack.Screen name="redemption/[id]" />
      </Stack.Protected>
      <Stack.Protected
        guard={
          !loading && !recoveringPassword && (role === 'company_owner' || role === 'company_worker')
        }
      >
        <Stack.Screen name="company" />
      </Stack.Protected>
      <Stack.Protected guard={!loading && !recoveringPassword && role === 'platform_admin'}>
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}
