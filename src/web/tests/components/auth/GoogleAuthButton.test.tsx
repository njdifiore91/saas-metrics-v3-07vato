import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from '@jest/axe';
import { jest, expect, describe, it, beforeEach } from '@jest/globals';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { lightTheme } from '../../../src/assets/styles/theme';
import GoogleAuthButton from '../../../src/components/auth/GoogleAuthButton';
import { authService } from '../../../src/services/auth.service';
import { UserRole } from '../../../src/types/auth.types';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock window.open
const mockWindowOpen = jest.fn();
window.open = mockWindowOpen;

// Mock window.addEventListener
const mockAddEventListener = jest.fn();
window.addEventListener = mockAddEventListener;

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Mock auth service
jest.mock('../../../src/services/auth.service', () => ({
  authService: {
    handleGoogleAuth: jest.fn(),
    validateToken: jest.fn(),
    retryAuth: jest.fn()
  }
}));

// Test utilities
const renderWithProviders = (props = {}) => {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={lightTheme}>
        <GoogleAuthButton {...props} />
      </ThemeProvider>
    </MemoryRouter>
  );
};

describe('GoogleAuthButton Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering and Visual States', () => {
    it('renders in default state correctly', () => {
      renderWithProviders();
      const button = screen.getByTestId('google-auth-button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Sign in with Google');
      expect(button).not.toBeDisabled();
    });

    it('renders in loading state', () => {
      renderWithProviders();
      const button = screen.getByTestId('google-auth-button');
      fireEvent.click(button);
      expect(button).toHaveTextContent('Signing in...');
      expect(button).toBeDisabled();
    });

    it('applies custom size prop correctly', () => {
      renderWithProviders({ size: 'large' });
      const button = screen.getByTestId('google-auth-button');
      expect(button).toHaveClass('MuiButton-sizeLarge');
    });

    it('applies fullWidth prop correctly', () => {
      renderWithProviders({ fullWidth: true });
      const button = screen.getByTestId('google-auth-button');
      expect(button).toHaveClass('MuiButton-fullWidth');
    });
  });

  describe('Authentication Flow', () => {
    const mockGoogleResponse = {
      code: 'test-auth-code',
      scope: 'email profile',
      authuser: '0',
      prompt: 'consent'
    };

    const mockUser = {
      id: 'test-user-id',
      email: 'test@example.com',
      role: UserRole.COMPANY_USER,
      companyId: 'test-company-id',
      preferences: {},
      lastLogin: new Date()
    };

    it('handles successful authentication flow', async () => {
      const onSuccess = jest.fn();
      const onLoading = jest.fn();
      
      (authService.validateToken as jest.Mock).mockResolvedValueOnce(null);
      (authService.handleGoogleAuth as jest.Mock).mockResolvedValueOnce(mockUser);

      renderWithProviders({ onSuccess, onLoading });

      const button = screen.getByTestId('google-auth-button');
      fireEvent.click(button);

      expect(onLoading).toHaveBeenCalledWith(true);
      expect(mockWindowOpen).toHaveBeenCalledWith(
        `${process.env.REACT_APP_API_URL}/auth/google`,
        'Google Sign In',
        'width=500,height=600'
      );

      // Simulate Google OAuth response
      const messageHandler = mockAddEventListener.mock.calls[0][1];
      messageHandler({
        origin: process.env.REACT_APP_API_URL,
        data: { type: 'GOOGLE_AUTH_SUCCESS', payload: mockGoogleResponse }
      });

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          accessToken: mockGoogleResponse.code
        }));
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
        expect(onLoading).toHaveBeenCalledWith(false);
      });
    });

    it('handles authentication errors with retry', async () => {
      const onError = jest.fn();
      const error = new Error('Auth failed');
      
      (authService.validateToken as jest.Mock).mockResolvedValueOnce(null);
      (authService.handleGoogleAuth as jest.Mock).mockRejectedValueOnce(error);
      (authService.retryAuth as jest.Mock).mockResolvedValueOnce(true);

      renderWithProviders({ onError, retryAttempts: 3 });

      const button = screen.getByTestId('google-auth-button');
      fireEvent.click(button);

      // Simulate Google OAuth error
      const messageHandler = mockAddEventListener.mock.calls[0][1];
      messageHandler({
        origin: process.env.REACT_APP_API_URL,
        data: { type: 'GOOGLE_AUTH_ERROR', payload: 'Authentication failed' }
      });

      await waitFor(() => {
        expect(authService.retryAuth).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('handles non-retryable errors', async () => {
      const onError = jest.fn();
      const error = { code: 'USER_CANCELLED', message: 'User cancelled auth' };
      
      (authService.validateToken as jest.Mock).mockResolvedValueOnce(null);
      (authService.handleGoogleAuth as jest.Mock).mockRejectedValueOnce(error);

      renderWithProviders({ onError });

      const button = screen.getByTestId('google-auth-button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
          code: 'USER_CANCELLED',
          message: 'User cancelled auth',
          retryable: false
        }));
      });
    });
  });

  describe('Accessibility Compliance', () => {
    it('meets WCAG 2.1 Level AA standards', async () => {
      const { container } = renderWithProviders();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports keyboard navigation', () => {
      renderWithProviders();
      const button = screen.getByTestId('google-auth-button');
      
      // Test focus handling
      button.focus();
      expect(button).toHaveFocus();

      // Test keyboard activation
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(mockWindowOpen).toHaveBeenCalled();
    });

    it('has appropriate ARIA attributes', () => {
      renderWithProviders();
      const button = screen.getByTestId('google-auth-button');
      
      expect(button).toHaveAttribute('aria-label', 'Sign in with Google');
      expect(button).toHaveAttribute('role', 'button');
    });
  });

  describe('Performance Metrics', () => {
    it('completes authentication within 2 second threshold', async () => {
      const startTime = performance.now();
      
      (authService.validateToken as jest.Mock).mockResolvedValueOnce(null);
      (authService.handleGoogleAuth as jest.Mock).mockResolvedValueOnce({
        id: 'test-id',
        email: 'test@example.com'
      });

      renderWithProviders();
      const button = screen.getByTestId('google-auth-button');
      fireEvent.click(button);

      await waitFor(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        expect(duration).toBeLessThan(2000);
      });
    });

    it('handles multiple rapid clicks efficiently', async () => {
      renderWithProviders();
      const button = screen.getByTestId('google-auth-button');

      // Simulate multiple rapid clicks
      for (let i = 0; i < 5; i++) {
        fireEvent.click(button);
      }

      // Verify only one authentication flow was initiated
      expect(mockWindowOpen).toHaveBeenCalledTimes(1);
    });
  });
});