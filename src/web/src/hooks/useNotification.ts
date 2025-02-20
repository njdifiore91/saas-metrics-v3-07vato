import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * @version 18.2.0
 * Enum defining available notification types with corresponding ARIA roles and Material Design colors
 */
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

/**
 * Configuration interface for notifications with accessibility and animation options
 */
export interface NotificationConfig {
  message: string;
  type: NotificationType;
  duration?: number;
  autoHide?: boolean;
  ariaLabel?: string;
  role?: 'alert' | 'status' | 'log';
  animate?: boolean;
  theme?: 'light' | 'dark';
}

/**
 * Interface for notification state with animation and accessibility properties
 */
interface NotificationState {
  open: boolean;
  config: NotificationConfig;
  isAnimating: boolean;
  ariaLive: 'polite' | 'assertive' | 'off';
  isAutoHiding: boolean;
}

/**
 * Default configuration for notifications
 */
const DEFAULT_CONFIG: Partial<NotificationConfig> = {
  duration: 5000,
  autoHide: true,
  animate: true,
  role: 'status',
  theme: 'light'
};

/**
 * ARIA live region mappings for notification types
 */
const ARIA_LIVE_MAPPINGS: Record<NotificationType, 'polite' | 'assertive'> = {
  [NotificationType.SUCCESS]: 'polite',
  [NotificationType.INFO]: 'polite',
  [NotificationType.WARNING]: 'assertive',
  [NotificationType.ERROR]: 'assertive'
};

/**
 * Custom hook for managing notification state and actions with accessibility and animation support
 * @returns Object containing notification state and control functions
 */
export const useNotification = () => {
  // Initialize notification state
  const [state, setState] = useState<NotificationState>({
    open: false,
    config: {
      message: '',
      type: NotificationType.INFO,
      ...DEFAULT_CONFIG
    },
    isAnimating: false,
    ariaLive: 'polite',
    isAutoHiding: false
  });

  // Timer references for cleanup
  const autoHideTimer = useRef<NodeJS.Timeout>();
  const animationTimer = useRef<NodeJS.Timeout>();

  // Cleanup function
  useEffect(() => {
    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      if (animationTimer.current) clearTimeout(animationTimer.current);
    };
  }, []);

  /**
   * Shows a notification with the provided configuration
   */
  const showNotification = useCallback((config: NotificationConfig) => {
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config
    };

    setState(prev => ({
      ...prev,
      open: true,
      config: finalConfig,
      isAnimating: Boolean(finalConfig.animate),
      ariaLive: ARIA_LIVE_MAPPINGS[finalConfig.type],
      isAutoHiding: Boolean(finalConfig.autoHide)
    }));

    if (finalConfig.animate) {
      animationTimer.current = setTimeout(() => {
        setState(prev => ({ ...prev, isAnimating: false }));
      }, 300);
    }

    if (finalConfig.autoHide && finalConfig.duration) {
      autoHideTimer.current = setTimeout(() => {
        hideNotification();
      }, finalConfig.duration);
    }
  }, []);

  /**
   * Hides the current notification
   */
  const hideNotification = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
    }

    setState(prev => ({
      ...prev,
      open: false,
      isAnimating: Boolean(prev.config.animate),
      isAutoHiding: false
    }));

    if (state.config.animate) {
      animationTimer.current = setTimeout(() => {
        setState(prev => ({ ...prev, isAnimating: false }));
      }, 300);
    }
  }, [state.config.animate]);

  /**
   * Updates the current notification configuration
   */
  const updateNotification = useCallback((config: Partial<NotificationConfig>) => {
    setState(prev => ({
      ...prev,
      config: {
        ...prev.config,
        ...config
      }
    }));
  }, []);

  /**
   * Pauses the auto-hide timer
   */
  const pauseAutoHide = useCallback(() => {
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current);
      setState(prev => ({ ...prev, isAutoHiding: false }));
    }
  }, []);

  /**
   * Resumes the auto-hide timer
   */
  const resumeAutoHide = useCallback(() => {
    if (state.config.autoHide && state.config.duration) {
      setState(prev => ({ ...prev, isAutoHiding: true }));
      autoHideTimer.current = setTimeout(() => {
        hideNotification();
      }, state.config.duration);
    }
  }, [state.config.autoHide, state.config.duration, hideNotification]);

  return {
    state,
    showNotification,
    hideNotification,
    updateNotification,
    pauseAutoHide,
    resumeAutoHide
  };
};