import React from 'react';
import { styled, Tooltip as MuiTooltip, TooltipProps } from '@mui/material'; // @mui/material v5.14.0
import { lightTheme } from '../../assets/styles/theme';

// Extended props interface with enhanced accessibility support
interface CustomTooltipProps extends TooltipProps {
  title: string | React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  arrow?: boolean;
  enterDelay?: number;
  leaveDelay?: number;
  children: React.ReactElement;
  ariaLabel?: string;
  role?: string;
}

// Styled tooltip component with enhanced theme integration
const StyledTooltip = styled(MuiTooltip)(({ theme }) => ({
  '& .MuiTooltip-tooltip': {
    backgroundColor: theme.palette.mode === 'dark' 
      ? theme.palette.grey[900] 
      : theme.palette.grey[700],
    color: theme.palette.common.white,
    fontSize: '0.875rem',
    padding: theme.spacing(1, 2),
    maxWidth: 300,
    wordWrap: 'break-word',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[1],
    
    // High contrast mode support
    '@media (forced-colors: active)': {
      border: '1px solid currentColor',
    },
  },
  
  '& .MuiTooltip-arrow': {
    color: theme.palette.mode === 'dark' 
      ? theme.palette.grey[900] 
      : theme.palette.grey[700],
    
    '&::before': {
      border: '1px solid transparent',
    },
  },
  
  // Touch device interaction styles
  '@media (hover: none)': {
    '& .MuiTooltip-tooltip': {
      padding: theme.spacing(1.5, 2.5),
      fontSize: '1rem',
    },
  },
  
  // Focus visible styles for keyboard navigation
  '&.Mui-focusVisible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

// Enhanced tooltip component with accessibility and theme support
const Tooltip = React.memo<CustomTooltipProps>((props) => {
  const {
    children,
    title,
    placement = 'top',
    arrow = true,
    enterDelay = 200,
    leaveDelay = 0,
    ariaLabel = 'Additional information',
    role = 'tooltip',
    ...rest
  } = props;

  // Enhanced open event handler with accessibility support
  const handleOpen = React.useCallback((event: React.SyntheticEvent) => {
    // Handle keyboard events
    if (event.type === 'keydown') {
      const keyEvent = event as React.KeyboardEvent;
      if (keyEvent.key !== 'Enter' && keyEvent.key !== ' ') {
        return;
      }
      event.preventDefault();
    }

    // Update ARIA attributes for screen readers
    const target = event.currentTarget as HTMLElement;
    target.setAttribute('aria-expanded', 'true');
  }, []);

  // Enhanced close event handler
  const handleClose = React.useCallback((event: React.SyntheticEvent) => {
    const target = event.currentTarget as HTMLElement;
    target.setAttribute('aria-expanded', 'false');
  }, []);

  return (
    <StyledTooltip
      title={title}
      placement={placement}
      arrow={arrow}
      enterDelay={enterDelay}
      leaveDelay={leaveDelay}
      onOpen={handleOpen}
      onClose={handleClose}
      PopperProps={{
        modifiers: [{
          name: 'offset',
          options: {
            offset: [0, 8],
          },
        }],
      }}
      TransitionProps={{
        timeout: 300,
      }}
      {...rest}
      componentsProps={{
        tooltip: {
          role,
          'aria-label': ariaLabel,
          'data-testid': 'custom-tooltip',
        },
      }}
    >
      {React.cloneElement(children, {
        'aria-describedby': role,
        tabIndex: 0,
      })}
    </StyledTooltip>
  );
});

// Display name for development and debugging
Tooltip.displayName = 'Tooltip';

export default Tooltip;