import React, { forwardRef, useCallback } from 'react';
import { Snackbar, Alert, Slide, SlideProps } from '@mui/material'; // @mui/material v5.14.0
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.14.0
import { NotificationType, NotificationConfig } from '../../hooks/useNotification';
import { useTheme } from '../../hooks/useTheme';

// Enhanced styled Snackbar with theme integration and accessibility features
const StyledSnackbar = styled(Snackbar)(({ theme }) => ({
  '& .MuiSnackbar-root': {
    zIndex: theme.zIndex.snackbar,
  },
  '& .MuiAlert-root': {
    width: '100%',
    maxWidth: '600px',
    boxShadow: theme.shadows[3],
    borderRadius: theme.shape.borderRadius,
    [theme.breakpoints.down('sm')]: {
      width: 'calc(100% - 32px)',
    },
  },
  '& .MuiAlert-message': {
    width: '100%',
    fontWeight: theme.typography.fontWeightMedium,
    fontSize: theme.typography.body1.fontSize,
  },
  '& .MuiAlert-icon': {
    fontSize: '24px',
  },
}));

// Interface for notification component props
interface NotificationProps {
  open: boolean;
  message: string;
  type?: NotificationType;
  duration?: number;
  autoHide?: boolean;
  onClose?: () => void;
  anchorOrigin?: {
    vertical: 'top' | 'bottom';
    horizontal: 'left' | 'center' | 'right';
  };
  ariaLabel?: string;
  role?: 'alert' | 'status' | 'log';
}

// Slide transition component with enhanced accessibility
const SlideTransition = forwardRef<unknown, SlideProps>((props, ref) => (
  <Slide
    {...props}
    ref={ref}
    direction="down"
    mountOnEnter
    unmountOnExit
    timeout={{
      enter: 225,
      exit: 195,
    }}
  />
));

SlideTransition.displayName = 'SlideTransition';

// Main notification component with accessibility and animation features
export const Notification: React.FC<NotificationProps> = ({
  open,
  message,
  type = NotificationType.INFO,
  duration = 5000,
  autoHide = true,
  onClose,
  anchorOrigin = {
    vertical: 'top',
    horizontal: 'center',
  },
  ariaLabel,
  role = 'status',
}) => {
  const { theme, isDarkMode } = useTheme();

  // Handle notification close events
  const handleClose = useCallback(
    (event?: React.SyntheticEvent | Event, reason?: string) => {
      if (reason === 'clickaway') return;
      onClose?.();
    },
    [onClose]
  );

  // Get appropriate ARIA live value based on notification type
  const getAriaLive = (type: NotificationType): 'polite' | 'assertive' => {
    return type === NotificationType.ERROR || type === NotificationType.WARNING
      ? 'assertive'
      : 'polite';
  };

  // Get severity mapping for Material-UI Alert component
  const getSeverity = (type: NotificationType) => {
    return type.toLowerCase() as 'success' | 'error' | 'warning' | 'info';
  };

  return (
    <StyledSnackbar
      open={open}
      autoHideDuration={autoHide ? duration : null}
      onClose={handleClose}
      anchorOrigin={anchorOrigin}
      TransitionComponent={SlideTransition}
      aria-label={ariaLabel}
      role={role}
      aria-live={getAriaLive(type)}
    >
      <Alert
        onClose={handleClose}
        severity={getSeverity(type)}
        variant="filled"
        elevation={6}
        sx={{
          backgroundColor: theme.palette[getSeverity(type)].main,
          color: theme.palette[getSeverity(type)].contrastText,
          '& .MuiAlert-icon': {
            color: theme.palette[getSeverity(type)].contrastText,
          },
        }}
      >
        {message}
      </Alert>
    </StyledSnackbar>
  );
};

// Static methods for notification management
Notification.show = (config: NotificationConfig) => {
  // Implementation provided by parent component via useNotification hook
};

Notification.hide = () => {
  // Implementation provided by parent component via useNotification hook
};

Notification.update = (config: Partial<NotificationConfig>) => {
  // Implementation provided by parent component via useNotification hook
};

export default Notification;