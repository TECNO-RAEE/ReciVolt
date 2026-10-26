import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';

export function useScrollReset() {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useFocusEffect(
    useCallback(() => {
      scroll.current?.scrollTo({ x: 0, y: 0, animated: false });
    }, [])
  );
  return scroll;
}
