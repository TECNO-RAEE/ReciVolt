import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, useColors } from '@/theme';

type TabIconName = 'home' | 'map' | 'gift' | 'person';

function tabIcon(name: TabIconName) {
  return function TabIcon({
    color,
    size,
    focused,
  }: Readonly<{ color: ColorValue; size: number; focused: boolean }>) {
    return (
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={size}
        color={color ? (color as string) : undefined}
      />
    );
  };
}

export default function AppLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 10);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.navInactive,
        tabBarLabelStyle: {
          fontFamily: fonts.regular,
          fontSize: 11,
        },
        tabBarItemStyle: {
          minHeight: 48,
        },
        tabBarStyle: {
          minHeight: 58 + bottomInset,
          paddingTop: 8,
          paddingBottom: bottomInset,
          backgroundColor: colors.tabBarBackground,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Inicio',
          tabBarIcon: tabIcon('home'),
        }}
      />

      <Tabs.Screen
        name="green-points"
        options={{
          title: 'Puntos verdes',
          tabBarIcon: tabIcon('map'),
        }}
      />

      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Premios',
          tabBarIcon: tabIcon('gift'),
        }}
      />

      <Tabs.Screen name="my-activity" options={{ href: null }} />
      <Tabs.Screen name="my-points" options={{ href: null }} />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: tabIcon('person'),
        }}
      />
    </Tabs>
  );
}
