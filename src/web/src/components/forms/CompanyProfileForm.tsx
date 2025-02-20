import React, { useCallback } from 'react';
import {
  Grid,
  Typography,
  Button,
  MenuItem,
  Select,
  FormHelperText,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Box
} from '@mui/material';
import debounce from 'lodash/debounce';

import { CompanyProfile, RevenueRange } from '../../types/company.types';
import { companyProfileSchema } from '../../validation/company.schema';
import { useForm } from '../../hooks/useForm';

/**
 * Props interface for the CompanyProfileForm component
 */
interface CompanyProfileFormProps {
  initialValues?: CompanyProfile;
  onSubmit: (values: CompanyProfile) => Promise<void>;
  isLoading?: boolean;
  onError?: (error: Error) => void;
}

/**
 * Default initial values for the form
 */
const defaultInitialValues: CompanyProfile = {
  name: '',
  industry: '',
  revenueRange: RevenueRange.LESS_THAN_1M
};

/**
 * Industry options for the dropdown
 */
const INDUSTRY_OPTIONS = [
  'Software & Technology',
  'E-commerce',
  'Financial Services',
  'Healthcare',
  'Manufacturing',
  'Media & Entertainment',
  'Professional Services',
  'Retail',
  'Telecommunications',
  'Other'
];

/**
 * CompanyProfileForm component for creating and editing company profiles
 * Implements WCAG 2.1 Level AA accessibility standards
 */
export const CompanyProfileForm: React.FC<CompanyProfileFormProps> = ({
  initialValues = defaultInitialValues,
  onSubmit,
  isLoading = false,
  onError
}) => {
  // Initialize form with validation schema
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    isSubmitting,
    isValidating
  } = useForm<CompanyProfile>(
    companyProfileSchema,
    initialValues,
    onSubmit,
    {
      validateOnChange: true,
      validateOnBlur: true,
      onAutoSave: undefined // Disabled for this form
    }
  );

  // Debounced change handler for performance
  const debouncedHandleChange = useCallback(
    debounce(handleChange, 300),
    [handleChange]
  );

  // Form submission handler with error boundary
  const onFormSubmit = async (e: React.FormEvent) => {
    try {
      await handleSubmit(e);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  return (
    <Box
      component="form"
      onSubmit={onFormSubmit}
      noValidate
      aria-label="Company Profile Form"
    >
      <Grid container spacing={3}>
        {/* Company Name Field */}
        <Grid item xs={12}>
          <TextField
            id="company-name"
            name="name"
            label="Company Name"
            fullWidth
            required
            value={values.name}
            onChange={(e) => debouncedHandleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            error={touched.name && !!errors.name}
            helperText={touched.name && errors.name?.message}
            inputProps={{
              'aria-label': 'Company Name',
              'aria-describedby': 'company-name-helper-text',
              maxLength: 200
            }}
            disabled={isLoading || isSubmitting}
          />
          <FormHelperText id="company-name-helper-text">
            Enter your company's legal name
          </FormHelperText>
        </Grid>

        {/* Industry Field */}
        <Grid item xs={12}>
          <FormControl fullWidth error={touched.industry && !!errors.industry}>
            <InputLabel id="industry-label" required>
              Industry
            </InputLabel>
            <Select
              labelId="industry-label"
              id="industry"
              name="industry"
              value={values.industry}
              onChange={(e) => debouncedHandleChange('industry', e.target.value)}
              onBlur={() => handleBlur('industry')}
              aria-label="Industry Selection"
              disabled={isLoading || isSubmitting}
            >
              {INDUSTRY_OPTIONS.map((industry) => (
                <MenuItem key={industry} value={industry}>
                  {industry}
                </MenuItem>
              ))}
            </Select>
            {touched.industry && errors.industry && (
              <FormHelperText>{errors.industry.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Revenue Range Field */}
        <Grid item xs={12}>
          <FormControl fullWidth error={touched.revenueRange && !!errors.revenueRange}>
            <InputLabel id="revenue-range-label" required>
              Annual Revenue Range
            </InputLabel>
            <Select
              labelId="revenue-range-label"
              id="revenue-range"
              name="revenueRange"
              value={values.revenueRange}
              onChange={(e) => debouncedHandleChange('revenueRange', e.target.value)}
              onBlur={() => handleBlur('revenueRange')}
              aria-label="Revenue Range Selection"
              disabled={isLoading || isSubmitting}
            >
              {Object.values(RevenueRange).map((range) => (
                <MenuItem key={range} value={range}>
                  {range}
                </MenuItem>
              ))}
            </Select>
            {touched.revenueRange && errors.revenueRange && (
              <FormHelperText>{errors.revenueRange.message}</FormHelperText>
            )}
          </FormControl>
        </Grid>

        {/* Form Actions */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading || isSubmitting || isValidating}
              aria-label="Submit Company Profile"
            >
              {isLoading || isSubmitting ? (
                <>
                  <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Save Profile'
              )}
            </Button>
          </Box>
        </Grid>

        {/* Validation Status */}
        {isValidating && (
          <Grid item xs={12}>
            <Typography
              color="info"
              variant="caption"
              role="status"
              aria-live="polite"
            >
              Validating form...
            </Typography>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};