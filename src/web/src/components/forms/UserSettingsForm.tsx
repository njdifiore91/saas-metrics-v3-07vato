import React from 'react';
import { Box, Switch, Button, Alert, FormControlLabel, Select, MenuItem, FormControl, InputLabel } from '@mui/material'; // @mui/material v5.14.0
import debounce from 'lodash/debounce'; // lodash v4.17.21

import FormField from '../common/FormField';
import { useForm } from '../../hooks/useForm';
import { userPreferencesSchema } from '../../validation/user.schema';
import type { UserPreferences } from '../../types/auth.types';

interface UserSettingsFormProps {
  initialPreferences: UserPreferences;
  onSubmit: (values: UserPreferences) => Promise<void>;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const UserSettingsForm: React.FC<UserSettingsFormProps> = ({
  initialPreferences,
  onSubmit,
  autoSave = true,
  autoSaveDelay = 1000
}) => {
  const [saveStatus, setSaveStatus] = React.useState<{
    message: string;
    severity: 'success' | 'error' | 'info';
  } | null>(null);

  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    isSubmitting,
    isDirty
  } = useForm(
    userPreferencesSchema,
    initialPreferences,
    async (values) => {
      try {
        await onSubmit(values);
        setSaveStatus({
          message: 'Settings saved successfully',
          severity: 'success'
        });
      } catch (error) {
        setSaveStatus({
          message: 'Error saving settings',
          severity: 'error'
        });
      }
    },
    {
      validateOnChange: true,
      validateOnBlur: true,
      autoSave,
      autoSaveDelay,
      onAutoSave: async (values) => {
        try {
          await onSubmit(values);
          setSaveStatus({
            message: 'Changes saved automatically',
            severity: 'info'
          });
        } catch (error) {
          setSaveStatus({
            message: 'Error auto-saving changes',
            severity: 'error'
          });
        }
      }
    }
  );

  // Clear save status after 3 seconds
  React.useEffect(() => {
    if (saveStatus) {
      const timer = setTimeout(() => setSaveStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit(e);
  };

  return (
    <Box
      component="form"
      onSubmit={handleFormSubmit}
      noValidate
      sx={{ width: '100%', maxWidth: 600 }}
      aria-label="User Settings Form"
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

      <FormControl fullWidth margin="normal">
        <InputLabel id="theme-select-label">Display Theme</InputLabel>
        <Select
          labelId="theme-select-label"
          id="theme-select"
          name="theme"
          value={values.theme}
          onChange={(e) => handleChange('theme', e.target.value)}
          onBlur={() => handleBlur('theme')}
          error={touched.theme && Boolean(errors.theme)}
          aria-describedby={errors.theme ? 'theme-error' : undefined}
        >
          <MenuItem value="light">Light</MenuItem>
          <MenuItem value="dark">Dark</MenuItem>
          <MenuItem value="system">System Default</MenuItem>
        </Select>
        {touched.theme && errors.theme && (
          <Box id="theme-error" role="alert" sx={{ color: 'error.main', mt: 1, fontSize: '0.75rem' }}>
            {errors.theme}
          </Box>
        )}
      </FormControl>

      <FormControl fullWidth margin="normal">
        <FormControlLabel
          control={
            <Switch
              checked={values.notifications}
              onChange={(e) => handleChange('notifications', e.target.checked)}
              name="notifications"
              color="primary"
              aria-label="Enable notifications"
            />
          }
          label="Enable Notifications"
        />
      </FormControl>

      <FormControl fullWidth margin="normal">
        <InputLabel id="date-range-select-label">Default Date Range</InputLabel>
        <Select
          labelId="date-range-select-label"
          id="date-range-select"
          name="defaultDateRange"
          value={values.defaultDateRange}
          onChange={(e) => handleChange('defaultDateRange', e.target.value)}
          onBlur={() => handleBlur('defaultDateRange')}
          error={touched.defaultDateRange && Boolean(errors.defaultDateRange)}
          aria-describedby={errors.defaultDateRange ? 'date-range-error' : undefined}
        >
          <MenuItem value="7d">Last 7 Days</MenuItem>
          <MenuItem value="30d">Last 30 Days</MenuItem>
          <MenuItem value="90d">Last 90 Days</MenuItem>
          <MenuItem value="1y">Last Year</MenuItem>
        </Select>
        {touched.defaultDateRange && errors.defaultDateRange && (
          <Box id="date-range-error" role="alert" sx={{ color: 'error.main', mt: 1, fontSize: '0.75rem' }}>
            {errors.defaultDateRange}
          </Box>
        )}
      </FormControl>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          type="button"
          variant="outlined"
          onClick={() => resetForm()}
          disabled={isSubmitting || !isDirty}
          aria-label="Reset to default settings"
        >
          Reset Defaults
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || !isDirty}
          aria-label="Save settings changes"
        >
          Save Changes
        </Button>
      </Box>
    </Box>
  );
};

export default UserSettingsForm;