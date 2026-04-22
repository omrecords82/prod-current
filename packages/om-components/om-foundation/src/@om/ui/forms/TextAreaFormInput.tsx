/**
 * TextAreaFormInput - Enhanced textarea input component
 * Adapted from Raydar template with Material-UI integration
 */

import React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import { Controller, type FieldPath, type FieldValues, type Control } from 'react-hook-form';

export interface TextAreaFormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<TextFieldProps, 'name' | 'defaultValue' | 'multiline'> {
  name: TName;
  control: Control<TFieldValues>;
  defaultValue?: string;
  rules?: object;
  containerClassName?: string;
  noValidate?: boolean;
  rows?: number;
  maxRows?: number;
  autoResize?: boolean;
}

/**
 * Textarea input component with react-hook-form integration and auto-resize support
 * 
 * @example
 * ```tsx
 * <TextAreaFormInput
 *   name="description"
 *   control={control}
 *   label="Description"
 *   rows={4}
 *   maxRows={8}
 *   autoResize={true}
 *   rules={{ required: 'Description is required' }}
 * />
 * ```
 */
export const TextAreaFormInput = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  defaultValue = '',
  rules,
  containerClassName,
  noValidate,
  rows = 3,
  maxRows,
  autoResize = false,
  ...textFieldProps
}: TextAreaFormInputProps<TFieldValues, TName>) => {
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
            multiline
            rows={!autoResize ? rows : undefined}
            maxRows={autoResize ? maxRows || rows + 2 : undefined}
            minRows={autoResize ? rows : undefined}
            error={!noValidate && Boolean(fieldState.error)}
            helperText={!noValidate && fieldState.error?.message}
            fullWidth
          />
        )}
      />
    </div>
  );
};

export default TextAreaFormInput;