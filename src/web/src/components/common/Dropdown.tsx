import React, { useState, useCallback, useRef } from 'react';
import { Select, MenuItem, FormControl } from '@mui/material'; // @mui/material v5.14.0
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.14.0
import { MetricCategory } from '../types/metric.types';
import { lightTheme } from '../assets/styles/theme';

// Styled components for custom appearance
const StyledFormControl = styled(FormControl)(({ theme }) => ({
  width: '100%',
  marginBottom: theme.spacing(2),
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    transition: theme.transitions.create(['border-color', 'box-shadow']),
    '&:hover': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused': {
      borderColor: theme.palette.primary.main,
      boxShadow: `0 0 0 2px ${theme.palette.primary.light}`,
    },
    '&.Mui-error': {
      borderColor: theme.palette.error.main,
    },
  },
}));

const StyledSelect = styled(Select)(({ theme }) => ({
  '& .MuiSelect-select': {
    padding: theme.spacing(1.5),
  },
  '& .MuiMenuItem-root': {
    padding: theme.spacing(1),
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
    '&.Mui-selected': {
      backgroundColor: theme.palette.primary.light,
      color: theme.palette.primary.contrastText,
    },
  },
}));

export interface DropdownProps {
  options: string[];
  value: string | string[];
  multiple?: boolean;
  required?: boolean;
  label: string;
  placeholder?: string;
  onChange: (value: string | string[]) => void;
  error?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  multiple = false,
  required = false,
  label,
  placeholder = 'Select an option',
  onChange,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const announcer = useRef<HTMLDivElement>(null);

  // Accessibility helper for screen reader announcements
  const announce = useCallback((message: string) => {
    if (announcer.current) {
      announcer.current.textContent = message;
    }
  }, []);

  const handleChange = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    event.preventDefault();
    const newValue = event.target.value as string | string[];

    // Validate required field
    if (required && (!newValue || (Array.isArray(newValue) && newValue.length === 0))) {
      announce('Error: This field is required');
      return;
    }

    onChange(newValue);
    announce(`Selected: ${Array.isArray(newValue) ? newValue.join(', ') : newValue}`);
  }, [required, onChange, announce]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setIsFocused(true);
    announce('Dropdown list expanded');
  }, [announce]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setIsFocused(false);
    announce('Dropdown list collapsed');
  }, [announce]);

  const handleKeyboardNavigation = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        handleClose();
        break;
      case 'Enter':
      case ' ':
        if (!isOpen) {
          handleOpen();
        }
        break;
      case 'ArrowDown':
      case 'ArrowUp':
        if (!isOpen) {
          handleOpen();
        }
        break;
      default:
        break;
    }
  }, [isOpen, handleOpen, handleClose]);

  return (
    <>
      <StyledFormControl error={!!error}>
        <StyledSelect
          ref={selectRef}
          multiple={multiple}
          value={value}
          onChange={handleChange}
          onOpen={handleOpen}
          onClose={handleClose}
          onKeyDown={handleKeyboardNavigation}
          displayEmpty
          renderValue={(selected) => {
            if (!selected || (Array.isArray(selected) && selected.length === 0)) {
              return <em>{placeholder}</em>;
            }
            return Array.isArray(selected) ? selected.join(', ') : selected;
          }}
          aria-label={label}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? 'dropdown-error' : undefined}
        >
          {options.map((option) => (
            <MenuItem
              key={option}
              value={option}
              aria-selected={
                multiple
                  ? Array.isArray(value) && value.includes(option)
                  : value === option
              }
            >
              {option}
            </MenuItem>
          ))}
        </StyledSelect>
        {error && (
          <div
            id="dropdown-error"
            role="alert"
            style={{
              color: lightTheme.palette.error.main,
              fontSize: '0.75rem',
              marginTop: '3px',
            }}
          >
            {error}
          </div>
        )}
      </StyledFormControl>
      <div
        ref={announcer}
        role="status"
        aria-live="polite"
        style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
      />
    </>
  );
};

export default Dropdown;