import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // ^6.14.0
import { GoogleIcon } from '@mui/icons-material'; // 5.14.0
import { Button } from '../common/Button';
import { authService } from '../../services/auth.service';
import { User, UserRole, GoogleAuthResponse } from '../../types/auth.types';

// Interface for authenticated user data
interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Interface for authentication errors
interface AuthError {
  code: string;
  message: string;
  details: Record<string, unknown>;
  retryable: boolean;
}

// Props interface for the GoogleAuthButton component
interface GoogleAuthButtonProps {
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  onSuccess?: (user: AuthenticatedUser) => void;
  onError?: (error: AuthError) => void;
  onLoading?: (isLoading: boolean) => void;
  retryAttempts?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * GoogleAuthButton component that implements Google OAuth 2.0 authentication
 * with Material Design styling and WCAG 2.1 Level AA compliance
 */
export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = React.memo(({
  size = 'medium',
  fullWidth = false,
  onSuccess,
  onError,
  onLoading,
  retryAttempts = 3,
  className,
  disabled = false
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const retryCount = useRef(0);

  /**
   * Handles the retry logic for failed authentication attempts
   */
  const handleRetry = useCallback(async (error: AuthError): Promise<boolean> => {
    if (!error.retryable || retryCount.current >= retryAttempts) {
      return false;
    }

    retryCount.current += 1;
    const backoffDelay = Math.min(1000 * Math.pow(2, retryCount.current - 1), 10000);
    
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    
    try {
      await authService.retryAuth();
      return true;
    } catch {
      return false;
    }
  }, [retryAttempts]);

  /**
   * Handles the Google OAuth login flow
   */
  const handleGoogleLogin = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault();
    
    if (disabled || loading) {
      return;
    }

    setLoading(true);
    onLoading?.(true);
    retryCount.current = 0;

    try {
      // Check for existing valid token
      const existingToken = await authService.validateToken();
      if (existingToken) {
        navigate('/dashboard');
        return;
      }

      // Initialize Google OAuth flow
      const googleResponse = await new Promise<GoogleAuthResponse>((resolve, reject) => {
        const googleWindow = window.open(
          `${process.env.REACT_APP_API_URL}/auth/google`,
          'Google Sign In',
          'width=500,height=600'
        );

        window.addEventListener('message', (event) => {
          if (event.origin !== process.env.REACT_APP_API_URL) {
            return;
          }

          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            resolve(event.data.payload);
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            reject(new Error(event.data.payload));
          }
        }, { once: true });
      });

      // Handle authentication with backend
      const user = await authService.handleGoogleAuth(googleResponse);

      onSuccess?.({
        id: user.id,
        email: user.email,
        name: user.email.split('@')[0], // Basic name extraction
        accessToken: googleResponse.code,
        refreshToken: '', // Handled internally by authService
        expiresAt: Date.now() + (3600 * 1000) // 1 hour expiry
      });

      navigate('/dashboard');
    } catch (error) {
      const authError: AuthError = {
        code: error.code || 'AUTH_ERROR',
        message: error.message || 'Authentication failed',
        details: error.details || {},
        retryable: error.code !== 'USER_CANCELLED' && retryCount.current < retryAttempts
      };

      if (authError.retryable) {
        const retrySuccess = await handleRetry(authError);
        if (retrySuccess) {
          navigate('/dashboard');
          return;
        }
      }

      onError?.(authError);
    } finally {
      setLoading(false);
      onLoading?.(false);
    }
  }, [disabled, loading, handleRetry, navigate, onSuccess, onError, onLoading]);

  return (
    <Button
      variant="contained"
      size={size}
      fullWidth={fullWidth}
      disabled={disabled || loading}
      onClick={handleGoogleLogin}
      className={className}
      startIcon={<GoogleIcon />}
      aria-label="Sign in with Google"
      data-testid="google-auth-button"
      sx={{
        backgroundColor: '#4285f4',
        '&:hover': {
          backgroundColor: '#357abd'
        },
        '&.Mui-disabled': {
          backgroundColor: '#ccc'
        }
      }}
    >
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </Button>
  );
});

// Display name for debugging
GoogleAuthButton.displayName = 'GoogleAuthButton';

export default GoogleAuthButton;