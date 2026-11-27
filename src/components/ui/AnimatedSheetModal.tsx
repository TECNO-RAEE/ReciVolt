import { useEffect, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

type WebViewportRect = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
};

function useWebVisualViewport(active: boolean): WebViewportRect | null {
  const [rect, setRect] = useState<WebViewportRect | null>(null);

  useEffect(() => {
    if (!active || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const read = () => {
      const vv = window.visualViewport;
      setRect({
        width: vv ? Math.round(vv.width) : window.innerWidth,
        height: vv ? Math.round(vv.height) : window.innerHeight,
        offsetTop: vv ? Math.round(vv.offsetTop) : 0,
        offsetLeft: vv ? Math.round(vv.offsetLeft) : 0,
      });
    };
    read();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', read);
    vv?.addEventListener('scroll', read);
    window.addEventListener('resize', read);
    return () => {
      vv?.removeEventListener('resize', read);
      vv?.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, [active]);

  return active && Platform.OS === 'web' ? rect : null;
}

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
 * spring physics) and centered confirmation dialogs, respecting Reduce Motion and
 * shrunk virtual-keyboard viewports on mobile web & iOS.
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
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(visible);
  const webViewport = useWebVisualViewport(mounted);

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

  const webViewportStyle: ViewStyle | undefined =
    Platform.OS === 'web' && webViewport
      ? ({
          position: 'fixed',
          top: webViewport.offsetTop,
          left: webViewport.offsetLeft,
          width: webViewport.width,
          height: webViewport.height,
        } as unknown as ViewStyle)
      : undefined;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents={visible ? 'auto' : 'none'}
        style={[
          styles.root,
          webViewportStyle,
          presentation === 'sheet'
            ? [styles.rootSheet, { paddingTop: Math.max(insets.top, 12) }]
            : styles.rootDialog,
        ]}
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
      </KeyboardAvoidingView>
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
