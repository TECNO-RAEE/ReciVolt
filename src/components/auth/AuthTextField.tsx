import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
} from 'react-native';

import { SpringPressable } from '@/components/ui/SpringPressable';
import {
  fonts,
  motion,
  useColors,
  useThemedStyles,
  webInputReset,
  type ThemeColors,
} from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type AuthTextFieldProps = TextInputProps & {
  label?: string;
  iconName: IconName;
  inputRef?: Ref<TextInputInstance>;
  trailing?: ReactNode;
  passwordToggle?: boolean;
};

export function AuthTextField({
  label,
  iconName,
  inputRef,
  trailing,
  passwordToggle = false,
  style,
  ...inputProps
}: AuthTextFieldProps) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const [visible, setVisible] = useState(false);
  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.inputContainer}>
        <Ionicons name={iconName} size={25} color={colors.text} style={styles.inputIcon} />

        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          selectionColor={colors.primary}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          {...inputProps}
          secureTextEntry={passwordToggle ? !visible : inputProps.secureTextEntry}
        />

        {passwordToggle && (
          <SpringPressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            disabled={inputProps.editable === false}
            onPress={() => setVisible((value) => !value)}
            pressScale={motion.scale.icon}
            style={styles.toggle}
          >
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={25}
              color={colors.text}
            />
          </SpringPressable>
        )}
        {trailing}
      </View>
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    label: {
      minHeight: 24,
      paddingVertical: 2,
      fontFamily: fonts.semiBold,
      fontSize: 14,
      lineHeight: 20,
      color: colors.text,
    },

    inputContainer: {
      minHeight: 52,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderControl,
      borderRadius: 10,
    },

    toggle: {
      minWidth: 45,
      minHeight: 44,
      alignSelf: 'stretch',
      alignItems: 'center',
      justifyContent: 'center',
    },

    inputIcon: {
      marginLeft: 11,
      marginRight: 10,
    },

    input: {
      ...webInputReset,
      flex: 1,
      minWidth: 0,
      minHeight: 50,
      paddingVertical: 12,
      paddingRight: 14,
      fontFamily: fonts.regular,
      fontSize: 16,
      lineHeight: 23,
      color: colors.text,
    },
  });
