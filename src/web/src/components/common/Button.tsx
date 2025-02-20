import React from 'react';
import { styled, Button as MuiButton, ButtonProps } from '@mui/material'; // @mui/material v5.14.0
import { lightTheme } from '../../assets/styles/theme';

// Extended button props interface with comprehensive customization options
export interface CustomButtonProps extends ButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  fullWidth?: boolean;
  disabled?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  ariaLabel?: string;
  tabIndex?: number;
}

// Styled button component with comprehensive theme integration
const StyledButton = styled(MuiButton)<CustomButtonProps>(({ theme }) => ({
  // Base styles
  fontFamily: theme.typography.fontFamily,
  fontWeight: theme.typography.fontWeightMedium,
  borderRadius: theme.shape.borderRadius,
  textTransform: 'none',
  minWidth: 64,
  minHeight: 44, // Minimum touch target size for mobile
  padding: '8px 16px',
  transition: theme.transitions.create([
    'background-color',
    'box-shadow',
    'border-color',
    'color',
  ], {
    duration: theme.transitions.duration.short,
  }),

  // Size variants
  '&.MuiButton-sizeLarge': {
    padding: '12px 24px',
    fontSize: '1rem',
  },
  '&.MuiButton-sizeMedium': {
    padding: '8px 16px',
    fontSize: '0.875rem',
  },
  '&.MuiButton-sizeSmall': {
    padding: '4px 8px',
    fontSize: '0.8125rem',
  },

  // Focus and hover states
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
  '&:hover': {
    '@media (hover: hover)': {
      backgroundColor: theme.palette.primary.dark,
    },
  },

  // Disabled state
  '&.Mui-disabled': {
    opacity: 0.6,
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  // RTL support
  '& .MuiButton-startIcon': {
    marginRight: theme.direction === 'rtl' ? -4 : 8,
    marginLeft: theme.direction === 'rtl' ? 8 : -4,
  },
  '& .MuiButton-endIcon': {
    marginLeft: theme.direction === 'rtl' ? -4 : 8,
    marginRight: theme.direction === 'rtl' ? 8 : -4,
  },
}));

// Main button component with Material Design implementation
export const Button = React.memo<CustomButtonProps>(({
  variant = 'contained',
  size = 'medium',
  color = 'primary',
  fullWidth = false,
  disabled = false,
  startIcon,
  endIcon,
  ariaLabel,
  tabIndex = 0,
  children,
  onClick,
  ...props
}) => {
  // Enhanced click handler with keyboard support
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }

      // Handle keyboard events
      if (
        event.type === 'keydown' &&
        (event as React.KeyboardEvent).key !== 'Enter' &&
        (event as React.KeyboardEvent).key !== ' '
      ) {
        return;
      }

      onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    },
    [disabled, onClick]
  );

  return (
    <StyledButton
      variant={variant}
      size={size}
      color={color}
      fullWidth={fullWidth}
      disabled={disabled}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={handleClick}
      onKeyDown={handleClick}
      aria-label={ariaLabel}
      tabIndex={disabled ? -1 : tabIndex}
      role="button"
      disableRipple={disabled}
      disableElevation={variant !== 'contained'}
      {...props}
    >
      {children}
    </StyledButton>
  );
});

// Display name for debugging
Button.displayName = 'Button';

// Default props
Button.defaultProps = {
  variant: 'contained',
  size: 'medium',
  color: 'primary',
  type: 'button',
  tabIndex: 0,
};

export default Button;