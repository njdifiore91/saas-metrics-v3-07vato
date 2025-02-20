import React from 'react'; // react v18.2.0
import { CircularProgress, Box, Typography, styled } from '@mui/material'; // @mui/material v5.14.0
import { lightTheme } from '../../assets/styles/theme';

interface LoadingProps {
  /**
   * Size of the loading spinner - 'small' | 'medium' | 'large'
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * Optional message to display below the loading spinner
   */
  message?: string;
  
  /**
   * Whether to show the loading indicator with a background overlay
   * @default false
   */
  overlay?: boolean;
  
  /**
   * Additional CSS class name
   */
  className?: string;
  
  /**
   * Color of the loading spinner
   * @default 'primary'
   */
  color?: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
  
  /**
   * Z-index for overlay positioning
   * @default 1200
   */
  zIndex?: number;
}

// Size mappings for the CircularProgress component
const SIZE_MAPPINGS = {
  small: 24,
  medium: 40,
  large: 56,
};

const StyledLoadingContainer = styled(Box, {
  shouldForwardProp: prop => !['overlay'].includes(prop as string),
})<{ overlay?: boolean }>(({ theme, overlay }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  
  ...(overlay && {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(2px)',
    transition: theme.transitions.create(['opacity', 'background-color'], {
      duration: theme.transitions.duration.standard,
    }),
    
    // Dark mode support
    [theme.breakpoints.up('sm')]: {
      backgroundColor: theme.palette.mode === 'dark' 
        ? 'rgba(18, 18, 18, 0.9)' 
        : 'rgba(255, 255, 255, 0.9)',
    },
  }),
}));

/**
 * A reusable loading indicator component with accessibility support
 * and Material Design principles.
 */
const Loading: React.FC<LoadingProps> = ({
  size = 'medium',
  message,
  overlay = false,
  className,
  color = 'primary',
  zIndex = 1200,
}) => {
  return (
    <StyledLoadingContainer
      className={className}
      overlay={overlay}
      role="status"
      aria-live="polite"
      aria-busy="true"
      sx={{ zIndex: overlay ? zIndex : 'auto' }}
      data-testid="loading-container"
    >
      <CircularProgress
        size={SIZE_MAPPINGS[size]}
        color={color}
        thickness={4}
        aria-hidden="true"
        data-testid="loading-spinner"
      />
      {message && (
        <Typography
          variant="body2"
          color="textSecondary"
          align="center"
          sx={{ maxWidth: '80%', wordBreak: 'break-word' }}
          data-testid="loading-message"
        >
          {message}
        </Typography>
      )}
    </StyledLoadingContainer>
  );
};

export default Loading;