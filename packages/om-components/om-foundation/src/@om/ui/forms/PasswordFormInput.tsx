/**
 * PasswordFormInput - Enhanced password input with visibility toggle
 * Adapted from Raydar template with Material-UI integration
 */

import React, { useState } from 'react';
import { TextField, IconButton, InputAdornment, type TextFieldProps } from '@mui/material';
import { IconEye, IconEyeOff } from '@tabler/icons-react';
import { Controller, type FieldPath, type FieldValues, type Control } from 'react-hook-form';

export interface PasswordFormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<TextFieldProps, 'name' | 'defaultValue' | 'type'> {
  name: TName;
  control: Control<TFieldValues>;
  defaultValue?: string;
  rules?: object;
  containerClassName?: string;
  noValidate?: boolean;
  showToggle?: boolean;
}

/**
 * Password input component with visibility toggle and react-hook-form integration
 * 
 * @example
 * ```tsx
 * <PasswordFormInput
 *   name="password"
 *   control={control}
 *   label="Password"
 *   rules={{ 
 *     required: 'Password is required',
 *     minLength: { value: 8, message: 'Password must be at least 8 characters' }
 *   }}
 *   showToggle={true}
 * />
 * ```
 */
export const PasswordFormInput = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  defaultValue = '',
  rules,
  containerClassName,
  noValidate,
  showToggle = true,
  ...textFieldProps
}: PasswordFormInputProps<TFieldValues, TName>) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={containerClassName}>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue as any}
        rules={rules}
        render={({ field, fieldState }) => (
          <TextField
            {...textFieldProps}
            {...field}
            type={showPassword ? 'text' : 'password'}
            error={!noValidate && Boolean(fieldState.error)}
            helperText={!noValidate && fieldState.error?.message}
            fullWidth
            InputProps={{
              ...textFieldProps.InputProps,
              endAdornment: showToggle ? (
                <InputAdornment position="end">
                  <IconButton
                    onClick={togglePasswordVisibility}
                    edge="end"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <IconEyeOff size={20} /> : <IconEye size={20} />}
                  </IconButton>
                </InputAdornment>
              ) : textFieldProps.InputProps?.endAdornment,
            }}
          />
        )}
      />
    </div>
  );
};

export default PasswordFormInput;