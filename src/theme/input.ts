import { Platform, type TextStyle } from 'react-native';

/**
 * Removes default browser focus outlines and iOS Safari tap-highlight flashes on TextInputs
 * so selection keeps a clean themed caret instead of a secondary inner focus box.
 */
export const webInputReset: TextStyle =
  Platform.OS === 'web'
    ? ({
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none',
        WebkitTapHighlightColor: 'transparent',
      } as unknown as TextStyle)
    : {};
