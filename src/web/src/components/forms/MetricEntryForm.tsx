import React from 'react';
import { Box, Button, CircularProgress, Alert } from '@mui/material'; // @mui/material v5.14.0
import debounce from 'lodash/debounce'; // lodash v4.17.21

import FormField from '../common/FormField';
import { useForm } from '../../hooks/useForm';
import { metricEntrySchema } from '../../validation/metric.schema';
import { MetricDataType, MetricValidationRule } from '../../types/metric.types';
import { ValidationError } from '../../types/api.types';

interface MetricEntryFormProps {
  companyId: string;
  metricId: string;
  dataType: MetricDataType;
  validationRules: MetricValidationRule[];
  onSubmit: (values: any) => Promise<void>;
  onCancel: () => void;
  autoSave?: boolean;
  autoSaveInterval?: number;
  onValidationError?: (error: ValidationError) => void;
}

interface FormValues {
  companyId: string;
  metricId: string;
  value: number;
  periodStart: Date;
  periodEnd: Date;
}

export const MetricEntryForm: React.FC<MetricEntryFormProps> = ({
  companyId,
  metricId,
  dataType,
  validationRules,
  onSubmit,
  onCancel,
  autoSave = true,
  autoSaveInterval = 3000,
  onValidationError
}) => {
  // Initialize form with useForm hook
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    isSubmitting,
    isDirty
  } = useForm<FormValues>(
    metricEntrySchema,
    {
      companyId,
      metricId,
      value: 0,
      periodStart: new Date(),
      periodEnd: new Date()
    },
    onSubmit,
    {
      validateOnChange: true,
      validateOnBlur: true,
      autoSave,
      autoSaveDelay: autoSaveInterval,
      transformValues: (values) => ({
        ...values,
        value: formatValueByDataType(values.value, dataType)
      })
    }
  );

  // Format value based on metric data type
  const formatValueByDataType = React.useCallback((value: number, type: MetricDataType): number => {
    switch (type) {
      case MetricDataType.PERCENTAGE:
        return Number(value.toFixed(2));
      case MetricDataType.CURRENCY:
        return Math.round(value * 100) / 100;
      case MetricDataType.RATIO:
        return Number(value.toFixed(3));
      case MetricDataType.MONTHS:
        return Math.round(value);
      default:
        return Number(value.toFixed(validationRules[0]?.precision || 2));
    }
  }, [validationRules]);

  // Handle value change with debouncing
  const debouncedHandleChange = React.useMemo(
    () => debounce((field: string, value: any) => {
      setFieldValue(field, value);
    }, 300),
    [setFieldValue]
  );

  // Get field-specific validation rules
  const getFieldValidationRules = (fieldName: string): MetricValidationRule | undefined => {
    return validationRules.find(rule => rule.required);
  };

  // Format helper text based on data type
  const getHelperText = (fieldName: string): string => {
    if (errors[fieldName]) {
      return errors[fieldName].message;
    }

    switch (dataType) {
      case MetricDataType.PERCENTAGE:
        return 'Enter a percentage between 0% and 200%';
      case MetricDataType.CURRENCY:
        return 'Enter a positive currency amount';
      case MetricDataType.RATIO:
        return 'Enter a ratio between 0 and 10';
      case MetricDataType.MONTHS:
        return 'Enter number of months (0-60)';
      default:
        return 'Enter a numeric value';
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      noValidate
      aria-label="Metric Entry Form"
      sx={{ width: '100%', maxWidth: 600 }}
    >
      <FormField
        name="value"
        label="Metric Value"
        value={String(values.value)}
        type="number"
        error={touched.value && errors.value?.message}
        helperText={getHelperText('value')}
        required={getFieldValidationRules('value')?.required}
        validationType={dataType.toLowerCase() as any}
        validationRules={getFieldValidationRules('value')}
        onChange={(value) => debouncedHandleChange('value', Number(value))}
        onBlur={handleBlur}
        aria-label="Enter metric value"
      />

      <FormField
        name="periodStart"
        label="Period Start"
        value={values.periodStart.toISOString().split('T')[0]}
        type="date"
        error={touched.periodStart && errors.periodStart?.message}
        helperText="Select period start date"
        required={true}
        onChange={(value) => setFieldValue('periodStart', new Date(value))}
        onBlur={handleBlur}
        aria-label="Select period start date"
      />

      <FormField
        name="periodEnd"
        label="Period End"
        value={values.periodEnd.toISOString().split('T')[0]}
        type="date"
        error={touched.periodEnd && errors.periodEnd?.message}
        helperText="Select period end date"
        required={true}
        onChange={(value) => setFieldValue('periodEnd', new Date(value))}
        onBlur={handleBlur}
        aria-label="Select period end date"
      />

      {Object.keys(errors).length > 0 && (
        <Alert 
          severity="error" 
          sx={{ mt: 2 }}
          role="alert"
        >
          Please correct the validation errors before submitting
        </Alert>
      )}

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          aria-label="Cancel metric entry"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || !isDirty || Object.keys(errors).length > 0}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          aria-label="Save metric entry"
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </Box>
    </Box>
  );
};

export default MetricEntryForm;