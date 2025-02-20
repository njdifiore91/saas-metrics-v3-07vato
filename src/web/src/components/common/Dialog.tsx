import React from 'react';
import { Dialog as MuiDialog, DialogTitle, DialogContent, DialogActions, styled } from '@mui/material'; // @mui/material v5.14.0
import { Button } from './Button';
import { lightTheme } from '../../assets/styles/theme';

// Props interface with comprehensive accessibility and customization options
export interface CustomDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  actions?: React.ReactNode[];
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  fullScreen?: boolean;
  disableBackdropClick?: boolean;
  disableEscapeKeyDown?: boolean;
  hasUnsavedChanges?: boolean;
  onConfirmClose?: () => void;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

// Styled dialog component with enhanced theme integration and animations
const StyledDialog = styled(MuiDialog)(({ theme }) => ({
  // Backdrop styling
  '& .MuiBackdrop-root': {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },

  // Dialog paper styling
  '& .MuiDialog-paper': {
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[24],
    margin: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      margin: theme.spacing(1),
    },
    transition: theme.transitions.create(['transform', 'opacity'], {
      duration: theme.transitions.duration.enteringScreen,
    }),
  },

  // Title styling
  '& .MuiDialogTitle-root': {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.paper,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },

  // Content styling
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1.5),
    },
  },

  // Actions styling
  '& .MuiDialogActions-root': {
    padding: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.divider}`,
    '& > :not(:first-of-type)': {
      marginLeft: theme.spacing(1),
    },
  },

  // Focus visible outline
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
}));

// Enhanced dialog component with accessibility features and theme support
export const CustomDialog = React.memo<CustomDialogProps>(({
  open,
  onClose,
  title,
  content,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  fullScreen = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  hasUnsavedChanges = false,
  onConfirmClose,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
}) => {
  // Dialog title ID for accessibility
  const titleId = React.useMemo(() => 
    ariaLabelledBy || `dialog-title-${Math.random().toString(36).substr(2, 9)}`,
    [ariaLabelledBy]
  );

  // Content ID for accessibility
  const contentId = React.useMemo(() => 
    ariaDescribedBy || `dialog-content-${Math.random().toString(36).substr(2, 9)}`,
    [ariaDescribedBy]
  );

  // Enhanced close handler with unsaved changes check
  const handleClose = React.useCallback((
    event: {},
    reason: 'backdropClick' | 'escapeKeyDown'
  ) => {
    if (
      (reason === 'backdropClick' && disableBackdropClick) ||
      (reason === 'escapeKeyDown' && disableEscapeKeyDown)
    ) {
      return;
    }

    if (hasUnsavedChanges && onConfirmClose) {
      onConfirmClose();
    } else {
      onClose();
    }
  }, [onClose, disableBackdropClick, disableEscapeKeyDown, hasUnsavedChanges, onConfirmClose]);

  // Default actions if none provided
  const defaultActions = React.useMemo(() => [
    <Button
      key="close"
      variant="outlined"
      color="primary"
      onClick={onClose}
      aria-label="Close dialog"
    >
      Close
    </Button>
  ], [onClose]);

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen}
      aria-labelledby={titleId}
      aria-describedby={contentId}
      disableEscapeKeyDown={disableEscapeKeyDown}
      keepMounted={false}
      scroll="paper"
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <DialogContent id={contentId}>
        {content}
      </DialogContent>
      {(actions || defaultActions) && (
        <DialogActions>
          {actions || defaultActions}
        </DialogActions>
      )}
    </StyledDialog>
  );
});

// Display name for debugging
CustomDialog.displayName = 'CustomDialog';

// Default props
CustomDialog.defaultProps = {
  maxWidth: 'sm',
  fullWidth: true,
  fullScreen: false,
  disableBackdropClick: false,
  disableEscapeKeyDown: false,
  hasUnsavedChanges: false,
};

export default CustomDialog;