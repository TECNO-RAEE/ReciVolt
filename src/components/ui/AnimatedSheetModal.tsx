import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion, useColors, useThemedStyles, type ThemeColors } from '@/theme';

type AnimatedSheetModalProps = {
  visible: boolean;
  onClose: () => void;
  presentation?: 'sheet' | 'dialog';
  dismissible?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Shared 60/120fps iOS modal presenter supporting both bottom sheets (rising with
 * spring physics) and centered confirmation dialogs, respecting Reduce Motion.
 */
export function AnimatedSheetModal({
  visible,
  onClose,
  presentation = 'sheet',
  dismissible = true,
  containerStyle,
  children,
}: Readonly<AnimatedSheetModalProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);

  const backdropProgress = useSharedValue(visible ? 1 : 0);
  const contentProgress = useSharedValue(visible ? 1 : 0);

  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (visible) {
      backdropProgress.value = withTiming(1, {
        duration: motion.duration.backdropIn,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      });
      contentProgress.value = reducedMotion
        ? withTiming(1, {
            duration: motion.duration.dialogIn,
            easing: Easing.out(Easing.cubic),
          })
        : withSpring(1, {
            ...motion.sheetSpring,
            reduceMotion: ReduceMotion.System,
          });
      return;
    }

    if (!mounted) return;

    const exitDuration =
      presentation === 'sheet' ? motion.duration.sheetOut : motion.duration.dialogOut;

    backdropProgress.value = withTiming(0, {
      duration: motion.duration.backdropOut,
      easing: Easing.in(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    contentProgress.value = withTiming(0, {
      duration: exitDuration,
      easing: Easing.in(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });

    const timer = setTimeout(() => setMounted(false), exitDuration);
    return () => clearTimeout(timer);
  }, [visible, mounted, presentation, reducedMotion, backdropProgress, contentProgress]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropProgress.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => {
    if (presentation === 'sheet') {
      const progress = contentProgress.get();
      const translateY = reducedMotion
        ? 0
        : interpolate(progress, [0, 1], [motion.sheetSlideDistance, 0], Extrapolation.CLAMP);
      const opacity = reducedMotion ? progress : 1;
      return {
        opacity,
        transform: [{ translateY }],
      };
    }

    const progress = contentProgress.get();
    const scale = reducedMotion ? 1 : interpolate(progress, [0, 1], [motion.dialogStartScale, 1]);
    return {
      opacity: progress,
      transform: [{ scale }],
    };
  });

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      <View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.root, presentation === 'sheet' ? styles.rootSheet : styles.rootDialog]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.overlay },
            backdropAnimatedStyle,
          ]}
        >
          <Pressable
            accessible={false}
            importantForAccessibility="no"
            onPress={() => {
              if (dismissible) onClose();
            }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View accessibilityViewIsModal style={[containerStyle, contentAnimatedStyle]}>
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (_colors: ThemeColors) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    rootSheet: {
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    rootDialog: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
  });
