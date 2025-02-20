import React, { useCallback, useEffect, useState, memo } from 'react';
import { Container, Paper, Alert, CircularProgress } from '@mui/material';
import { CompanyProfileForm } from '../components/forms/CompanyProfileForm';
import ErrorBoundary from '../components/common/ErrorBoundary';
import { CompanyProfile } from '../types/company.types';
import { ApiError } from '../types/api.types';
import { NotificationType } from '../hooks/useNotification';
import { useTheme } from '../hooks/useTheme';

/**
 * CompanyProfilePage component for managing company profile information
 * Implements WCAG 2.1 Level AA compliance with proper ARIA labels and error handling
 * @version 1.0.0
 */
const CompanyProfilePage: React.FC = () => {
  // State management
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  // Theme configuration
  const { theme } = useTheme();

  /**
   * Fetches company profile data with error handling and cleanup
   */
  const fetchCompanyProfile = useCallback(async () => {
    const abortController = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/company/profile', {
        signal: abortController.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCompanyProfile(data);
    } catch (err) {
      if (err.name === 'AbortError') {
        return;
      }

      setError({
        code: 'FETCH_ERROR',
        message: 'Failed to load company profile',
        details: err instanceof Error ? { error: err.message } : {},
        validationErrors: [],
        stack: err instanceof Error ? err.stack || '' : '',
      });

      console.error('Error fetching company profile:', err);
    } finally {
      setIsLoading(false);
    }

    return () => {
      abortController.abort();
    };
  }, []);

  /**
   * Handles company profile form submission with validation
   */
  const handleProfileSubmit = useCallback(async (profileData: CompanyProfile) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/company/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update company profile');
      }

      const updatedProfile = await response.json();
      setCompanyProfile(updatedProfile);

      return {
        type: NotificationType.SUCCESS,
        message: 'Company profile updated successfully',
      };
    } catch (err) {
      setError({
        code: 'SUBMIT_ERROR',
        message: 'Failed to update company profile',
        details: err instanceof Error ? { error: err.message } : {},
        validationErrors: [],
        stack: err instanceof Error ? err.stack || '' : '',
      });

      console.error('Error updating company profile:', err);

      return {
        type: NotificationType.ERROR,
        message: err instanceof Error ? err.message : 'An unexpected error occurred',
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    const cleanup = fetchCompanyProfile();
    return () => {
      cleanup();
    };
  }, [fetchCompanyProfile]);

  return (
    <ErrorBoundary>
      <Container
        maxWidth="md"
        sx={{
          py: 4,
          minHeight: '100vh',
          backgroundColor: theme.palette.background.default,
        }}
      >
        <Paper
          elevation={2}
          sx={{
            p: 4,
            borderRadius: theme.shape.borderRadius,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          {/* Page Title with proper heading hierarchy */}
          <h1
            style={{
              ...theme.typography.h4,
              marginBottom: theme.spacing(3),
              color: theme.palette.text.primary,
            }}
          >
            Company Profile
          </h1>

          {/* Error Display */}
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              role="alert"
              aria-live="assertive"
            >
              {error.message}
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && !companyProfile && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: theme.spacing(4),
              }}
              role="status"
              aria-label="Loading company profile"
            >
              <CircularProgress />
            </div>
          )}

          {/* Company Profile Form */}
          {!isLoading && companyProfile && (
            <CompanyProfileForm
              initialValues={companyProfile}
              onSubmit={handleProfileSubmit}
              isLoading={isLoading}
              onError={(error) => {
                setError({
                  code: 'FORM_ERROR',
                  message: error.message,
                  details: {},
                  validationErrors: [],
                  stack: error.stack || '',
                });
              }}
            />
          )}
        </Paper>
      </Container>
    </ErrorBoundary>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(CompanyProfilePage);