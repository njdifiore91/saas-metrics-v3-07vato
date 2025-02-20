import React from 'react';
import { TextField } from '@mui/material'; // @mui/material v5.14.0
import { styled } from '@mui/material/styles'; // @mui/material v5.14.0
import CustomTooltip from './Tooltip';

// Validation types for different metric inputs
type ValidationType = 'metric' | 'date' | 'revenue' | 'percentage' | 'currency' | 'text';

// Interface for validation rules
interface ValidationRules {
  min?: number;
  max?: number;
  required?: boolean;
  pattern?: RegExp;
  customValidator?: (value: string) => boolean;
}

// Props interface for the FormField component
interface FormFieldProps {
  name: string;
  label: string;
  value: string;
  type?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  validationType?: ValidationType;
  validationRules?: ValidationRules;
  'aria-label'?: string;
  'aria-describedby'?: string;
  onChange: (value: string) => void;
  onBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  onValidation?: (isValid: boolean, error?: string) => void;
}

// Styled TextField component with enhanced accessibility and theme support
const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-root': {
    borderRadius: theme.shape.borderRadius,
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    
    '&.Mui-focused': {
      boxShadow: `0 0 0 2px ${theme.palette.primary.main}25`,
    },
  },
  
  '& .MuiInputLabel-root': {
    color: theme.palette.text.secondary,
    
    '&.Mui-focused': {
      color: theme.palette.primary.main,
    },
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  
  '& .MuiFormHelperText-root': {
    marginLeft: 0,
    fontSize: '0.75rem',
    
    '&.Mui-error': {
      color: theme.palette.error.main,
    },
  },
  
  // High contrast mode support
  '@media (forced-colors: active)': {
    '& .MuiInputBase-root': {
      borderColor: 'currentColor',
    },
  },
}));

// Validation functions for different metric types
const validateMetric = (value: string, rules?: ValidationRules): string | null => {
  if (!value && rules?.required) {
    return 'This field is required';
  }

  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return 'Please enter a valid number';
  }

  if (rules?.min !== undefined && numValue < rules.min) {
    return `Value must be greater than ${rules.min}`;
  }

  if (rules?.max !== undefined && numValue > rules.max) {
    return `Value must be less than ${rules.max}`;
  }

  return null;
};

const validateDate = (value: string): string | null => {
  if (!value) return null;

  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return 'Please enter a valid date';
  }

  if (date > new Date()) {
    return 'Date cannot be in the future';
  }

  return null;
};

const validateRevenue = (value: string, rules?: ValidationRules): string | null => {
  if (!value && rules?.required) {
    return 'Revenue range is required';
  }

  const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
  
  if (isNaN(numValue)) {
    return 'Please enter a valid revenue amount';
  }

  if (rules?.min !== undefined && numValue < rules.min) {
    return `Revenue must be greater than ${rules.min.toLocaleString()}`;
  }

  if (rules?.max !== undefined && numValue > rules.max) {
    return `Revenue must be less than ${rules.max.toLocaleString()}`;
  }

  return null;
};

const validatePercentage = (value: string): string | null => {
  if (!value) return null;

  const numValue = parseFloat(value);
  
  if (isNaN(numValue)) {
    return 'Please enter a valid percentage';
  }

  if (numValue < 0 || numValue > 200) {
    return 'Percentage must be between 0 and 200';
  }

  return null;
};

// FormField component with validation and accessibility support
export const FormField: React.FC<FormFieldProps> = React.memo((props) => {
  const {
    name,
    label,
    value,
    type = 'text',
    error,
    helperText,
    required = false,
    disabled = false,
    validationType,
    validationRules,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    onChange,
    onBlur,
    onValidation,
  } = props;

  const [touched, setTouched] = React.useState(false);
  const [internalError, setInternalError] = React.useState<string | undefined>(error);

  // Debounced validation handler
  const debouncedValidation = React.useCallback(
    React.useMemo(
      () =>
        debounce((value: string) => {
          let validationError: string | null = null;

          switch (validationType) {
            case 'metric':
              validationError = validateMetric(value, validationRules);
              break;
            case 'date':
              validationError = validateDate(value);
              break;
            case 'revenue':
              validationError = validateRevenue(value, validationRules);
              break;
            case 'percentage':
              validationError = validatePercentage(value);
              break;
            default:
              if (required && !value) {
                validationError = 'This field is required';
              }
          }

          setInternalError(validationError || undefined);
          onValidation?.(validationError === null, validationError || undefined);
        }, 300),
      [validationType, validationRules, required, onValidation]
    ),
    []
  );

  // Handle input change with validation
  const handleChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      onChange(newValue);
      debouncedValidation(newValue);
    },
    [onChange, debouncedValidation]
  );

  // Handle blur event with final validation
  const handleBlur = React.useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      setTouched(true);
      onBlur(event);
      debouncedValidation(event.target.value);
    },
    [onBlur, debouncedValidation]
  );

  // Format helper text with error handling
  const formattedHelperText = React.useMemo(() => {
    if (touched && internalError) {
      return internalError;
    }
    return helperText;
  }, [touched, internalError, helperText]);

  return (
    <CustomTooltip
      title={formattedHelperText || ''}
      placement="bottom"
      open={Boolean(touched && internalError)}
    >
      <StyledTextField
        name={name}
        label={label}
        value={value}
        type={type}
        error={touched && Boolean(internalError)}
        helperText={formattedHelperText}
        required={required}
        disabled={disabled}
        onChange={handleChange}
        onBlur={handleBlur}
        fullWidth
        variant="outlined"
        size="medium"
        InputProps={{
          'aria-label': ariaLabel || label,
          'aria-describedby': ariaDescribedBy,
          'aria-invalid': touched && Boolean(internalError),
          'aria-required': required,
        }}
        inputProps={{
          'data-testid': `form-field-${name}`,
        }}
      />
    </CustomTooltip>
  );
});

// Utility function for debouncing
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

FormField.displayName = 'FormField';

export default FormField;