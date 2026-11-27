import { useEffect, useState } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { motion } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type SpringPressableProps = Omit<PressableProps, 'style'> & {
  pressScale?: number;
  pressedOpacity?: number;
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>);
};

/**
 * UI-thread tactile press control with spring compression on normal motion
 * and subtle opacity fade when system Reduce Motion is active.
 */
export function SpringPressable({
  pressScale = motion.scale.button,
  pressedOpacity = motion.opacity.pressed,
  disabled,
  style,
  onPressIn,
  onPressOut,
  children,
  ...rest
}: Readonly<SpringPressableProps>) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const [pressedState, setPressedState] = useState(false);
  const usesStyleFn = typeof style === 'function';

  useEffect(() => {
    if (disabled) {
      progress.set(0);
    }
  }, [disabled, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = reducedMotion ? 1 : interpolate(progress.get(), [0, 1], [1, pressScale]);
    const opacity = interpolate(progress.get(), [0, 1], [1, pressedOpacity]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const resolvedStyle = usesStyleFn ? style({ pressed: !disabled && pressedState }) : style;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) {
          if (usesStyleFn) setPressedState(true);
          progress.set(
            reducedMotion
              ? withTiming(1, { duration: motion.duration.pressFade })
              : withSpring(1, { ...motion.pressSpring, reduceMotion: ReduceMotion.System })
          );
        }
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        if (usesStyleFn) setPressedState(false);
        progress.set(
          reducedMotion
            ? withTiming(0, { duration: motion.duration.pressFade })
            : withSpring(0, { ...motion.pressSpring, reduceMotion: ReduceMotion.System })
        );
        onPressOut?.(event);
      }}
      style={[resolvedStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
