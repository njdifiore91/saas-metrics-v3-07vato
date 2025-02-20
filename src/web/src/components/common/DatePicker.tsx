import React, { useCallback, useState, useEffect } from 'react';
import { DatePicker as MuiDatePicker } from '@mui/x-date-pickers'; // ^6.10.0
import { LocalizationProvider } from '@mui/x-date-pickers'; // ^6.10.0
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // ^6.10.0
import { TextField } from '@mui/material'; // ^5.14.0
import { formatDate, isValidDateRange, isFutureDate } from '../../utils/date.utils';

interface DatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  label: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  minDate?: Date | null;
  maxDate?: Date | null;
  disableFuture?: boolean;
  helperText?: string;
  ariaLabel?: string;
  testId?: string;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  maxRangeMonths?: number;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  required = false,
  error,
  disabled = false,
  minDate,
  maxDate,
  disableFuture = false,
  helperText,
  ariaLabel,
  testId = 'date-picker',
  rangeStart,
  rangeEnd,
  maxRangeMonths = 12
}) => {
  const [validationError, setValidationError] = useState<string | null>(null);
  const [internalValue, setInternalValue] = useState<Date | null>(value);

  // Reset internal value when external value changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const validateDate = useCallback((date: Date | null): boolean => {
    if (!date) {
      if (required) {
        setValidationError('This field is required');
        return false;
      }
      setValidationError(null);
      return true;
    }

    // Validate minimum date
    if (minDate && date < minDate) {
      setValidationError(`Date must be after ${formatDate(minDate, 'MM/dd/yyyy')}`);
      return false;
    }

    // Validate maximum date
    if (maxDate && date > maxDate) {
      setValidationError(`Date must be before ${formatDate(maxDate, 'MM/dd/yyyy')}`);
      return false;
    }

    // Validate future date restriction
    if (disableFuture && isFutureDate(date)) {
      setValidationError('Future dates are not allowed');
      return false;
    }

    // Validate date range if part of a range
    if (rangeStart && rangeEnd) {
      const rangeValidation = isValidDateRange(rangeStart, rangeEnd, {
        maxRangeMonths,
        allowFutureDates: !disableFuture
      });
      
      if (!rangeValidation.isValid) {
        setValidationError(rangeValidation.errors[0]);
        return false;
      }
    }

    setValidationError(null);
    return true;
  }, [required, minDate, maxDate, disableFuture, rangeStart, rangeEnd, maxRangeMonths]);

  const handleDateChange = useCallback((newDate: Date | null) => {
    setInternalValue(newDate);
    
    if (validateDate(newDate)) {
      onChange(newDate);
    }
  }, [onChange, validateDate]);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <div
        role="group"
        aria-labelledby={`${testId}-label`}
        data-testid={testId}
      >
        <MuiDatePicker
          value={internalValue}
          onChange={handleDateChange}
          disabled={disabled}
          slotProps={{
            textField: {
              label,
              required,
              error: !!validationError || !!error,
              helperText: validationError || error || helperText,
              inputProps: {
                'aria-label': ariaLabel || label,
                'aria-required': required,
                'aria-invalid': !!(validationError || error),
                'aria-describedby': `${testId}-helper-text`
              }
            },
            day: {
              disableFuture,
              disabled: (date) => {
                if (!date) return false;
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                if (disableFuture && isFutureDate(date)) return true;
                return false;
              }
            }
          }}
          format="MM/dd/yyyy"
        />
        {(validationError || error || helperText) && (
          <div
            id={`${testId}-helper-text`}
            className="MuiFormHelperText-root"
            role="alert"
            aria-live="polite"
          >
            {validationError || error || helperText}
          </div>
        )}
      </div>
    </LocalizationProvider>
  );
};

export default DatePicker;