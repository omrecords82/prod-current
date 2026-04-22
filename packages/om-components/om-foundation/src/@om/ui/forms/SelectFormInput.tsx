/**
 * SelectFormInput - Enhanced select input component with form validation
 * Unified component supporting both simple and complex option structures
 */

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText, type SelectProps } from '@mui/material';
import { Controller, type FieldPath, type FieldValues, type Control } from 'react-hook-form';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectFormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<SelectProps, 'name' | 'defaultValue'> {
  name: TName;
  control: Control<TFieldValues>;
  options: SelectOption[] | string[];
  defaultValue?: string | number;
  rules?: object;
  containerClassName?: string;
  noValidate?: boolean;
}

/**
 * Enhanced select input component with react-hook-form integration
 * 
 * @example
 * ```tsx
 * <SelectFormInput
 *   name="role"
 *   control={control}
 *   label="User Role"
 *   options={[
 *     { value: 'admin', label: 'Administrator' },
 *     { value: 'user', label: 'User' }
 *   ]}
 *   rules={{ required: 'Role is required' }}
 * />
 * ```
 */
export const SelectFormInput = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  options,
  defaultValue = '',
  rules,
  containerClassName,
  noValidate,
  label,
  ...selectProps
}: SelectFormInputProps<TFieldValues, TName>) => {
  const normalizedOptions: SelectOption[] = options.map(option => 
    typeof option === 'string' 
      ? { value: option, label: option }
      : option
  );

  return (
    <div className={containerClassName}>
      <Controller
        name={name}
        control={control}
        defaultValue={defaultValue as any}
        rules={rules}
        render={({ field, fieldState }) => (
          <FormControl fullWidth error={!noValidate && Boolean(fieldState.error)}>
            {label && <InputLabel>{label}</InputLabel>}
            <Select
              {...selectProps}
              {...field}
              label={label}
            >
              {normalizedOptions.map((option) => (
                <MenuItem 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {!noValidate && fieldState.error && (
              <FormHelperText>{fieldState.error.message}</FormHelperText>
            )}
          </FormControl>
        )}
      />
    </div>
  );
};

export default SelectFormInput;