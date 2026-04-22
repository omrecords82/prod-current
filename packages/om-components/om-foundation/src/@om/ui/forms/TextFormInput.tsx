/**
 * TextFormInput - Enhanced text input component with form validation
 * Unified from Raydar template with Material-UI integration
 */

import React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import { Controller, type FieldPath, type FieldValues, type Control } from 'react-hook-form';

export interface TextFormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<TextFieldProps, 'name' | 'defaultValue'> {
  name: TName;
  control: Control<TFieldValues>;
  defaultValue?: string;
  rules?: object;
  containerClassName?: string;
  noValidate?: boolean;
}

/**
 * Enhanced text input component with react-hook-form integration
 * 
 * @example
 * ```tsx
 * <TextFormInput
 *   name="email"
 *   control={control}
 *   label="Email Address"
 *   type="email"
 *   rules={{ required: 'Email is required' }}
 * />
 * ```
 */
export const TextFormInput = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  defaultValue = '',
  rules,
  containerClassName,
  noValidate,
  ...textFieldProps
}: TextFormInputProps<TFieldValues, TName>) => {
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
            error={!noValidate && Boolean(fieldState.error)}
            helperText={!noValidate && fieldState.error?.message}
            fullWidth
          />
        )}
      />
    </div>
  );
};

export default TextFormInput;