import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps, ReactNode, Ref } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

type AuthTextFieldProps = TextInputProps & {
  label?: string;
  iconName: IconName;
  inputRef?: Ref<TextInput>;
  trailing?: ReactNode;
};

export function AuthTextField({
  label,
  iconName,
  inputRef,
  trailing,
  style,
  ...inputProps
}: AuthTextFieldProps) {
  return (
    <>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={styles.inputContainer}>
        <Ionicons name={iconName} size={25} color={colors.text} style={styles.inputIcon} />

        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          style={[styles.input, style]}
          placeholderTextColor={colors.text}
          {...inputProps}
        />

        {trailing}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    height: 24,
    fontFamily: fonts.regular,
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
    fontSize: 14,
    color: colors.text,
  },
});
