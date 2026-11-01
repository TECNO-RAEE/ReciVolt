import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputInstance,
  type TextInputProps,
  View,
} from 'react-native';

import { colors, fonts } from '@/theme';

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
  const [visible, setVisible] = useState(false);
  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.inputContainer}>
        <Ionicons name={iconName} size={25} color={colors.text} style={styles.inputIcon} />

        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          style={[styles.input, style]}
          placeholderTextColor={colors.textSecondary}
          {...inputProps}
          secureTextEntry={passwordToggle ? !visible : inputProps.secureTextEntry}
        />

        {passwordToggle && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            disabled={inputProps.editable === false}
            onPress={() => setVisible((value) => !value)}
            style={styles.toggle}
          >
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={25}
              color={colors.text}
            />
          </Pressable>
        )}
        {trailing}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    height: 24,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 17,
    color: colors.text,
  },

  inputContainer: {
    height: 52,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
  },

  toggle: { width: 45, height: '100%', alignItems: 'center', justifyContent: 'center' },

  inputIcon: {
    marginLeft: 11,
    marginRight: 10,
  },

  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingVertical: 0,
    paddingRight: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
  },
});
