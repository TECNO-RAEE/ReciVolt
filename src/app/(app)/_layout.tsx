import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/js-tabs';


import type { ColorValue } from 'react-native';
import { colors, fonts } from '@/theme';

type TabIconName = 'home' | 'map' | 'gift' | 'person';

function tabIcon(name: TabIconName) {
  return function TabIcon({
    color,
    size,
    focused,
  }: Readonly<{ color: ColorValue; size: number; focused: boolean }>) {
    return <Ionicons name={focused ? name : `${name}-outline`} size={size} color={color ? (color as string) : undefined} />;
  };
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#748591',
        tabBarLabelStyle: {
          fontFamily: fonts.regular,
          fontSize: 11,
        },
        tabBarStyle: {
          minHeight: 72,
          paddingTop: 8,
          paddingBottom: 12,
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
