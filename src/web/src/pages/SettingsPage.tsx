import React, { useCallback, useState } from 'react';
import { Box, Container, Paper, Alert, CircularProgress } from '@mui/material'; // @mui/material v5.14.0
import debounce from 'lodash/debounce'; // lodash v4.17.21

// Internal imports
import PageHeader from '../components/common/PageHeader';
import UserSettingsForm from '../components/forms/UserSettingsForm';
import ErrorBoundary from '../components/common/ErrorBoundary';
import useAuth from '../hooks/useAuth';
import type { UserPreferences } from '../types/auth.types';

/**
 * Settings page component that provides user preferences management interface
 * with enhanced error handling, auto-save functionality, and accessibility improvements
 */
const SettingsPage: React.FC = React.memo(() => {
  // Get user data and auth state
  const { user, loading, error } = useAuth();
  
  // Local state for save status
  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    severity: 'success' | 'error';
  } | null>(null);

  /**
   * Handles settings form submission with debounced auto-save
   * @param preferences - Updated user preferences
   */
  const handleSettingsSubmit = useCallback(async (preferences: UserPreferences) => {
    try {
      setSaveStatus(null);

      // Make API call to update user preferences
      const response = await fetch('/api/v1/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      setSaveStatus({
        message: 'Settings saved successfully',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus({
        message: 'Failed to save settings. Please try again.',
        severity: 'error',
      });
    }
  }, []);

  /**
   * Debounced version of settings submission for auto-save
   */
  const debouncedSave = useCallback(
    debounce((preferences: UserPreferences) => {
      handleSettingsSubmit(preferences);
    }, 500),
    [handleSettingsSubmit]
  );

  /**
   * Renders the settings form with loading and error states
   */
  const renderSettingsForm = () => {
    if (loading) {
      return (
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="200px"
        >
          <CircularProgress 
            aria-label="Loading settings" 
            role="progressbar" 
          />
        </Box>
      );
    }

    if (error || !user) {
      return (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          role="alert"
        >
          {error || 'Unable to load user settings'}
        </Alert>
      );
    }

    return (
      <UserSettingsForm
        initialPreferences={user.preferences}
        onSubmit={debouncedSave}
        autoSave={true}
        autoSaveDelay={500}
      />
    );
  };

  return (
    <ErrorBoundary>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <PageHeader
          title="Settings"
          subtitle="Manage your preferences and account settings"
          aria-label="Settings page header"
        />

        <Paper
          elevation={0}
          sx={{
            p: 3,
            mt: 3,
            backgroundColor: 'background.paper',
            borderRadius: 1,
          }}
        >
          {saveStatus && (
            <Alert 
              severity={saveStatus.severity}
              sx={{ mb: 2 }}
              role="status"
            >
              {saveStatus.message}
            </Alert>
          )}

          {renderSettingsForm()}
        </Paper>
      </Container>
    </ErrorBoundary>
  );
});

// Display name for debugging
SettingsPage.displayName = 'SettingsPage';

export default SettingsPage;