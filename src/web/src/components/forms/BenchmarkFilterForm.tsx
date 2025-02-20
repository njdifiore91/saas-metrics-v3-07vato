import React from 'react';
import { Grid, MenuItem, Button, Chip, FormControl, InputLabel, Select, TextField } from '@mui/material'; // @mui/material v5.14.0
import { DatePicker } from '@mui/x-date-pickers'; // @mui/x-date-pickers v6.10.0
import FormField from '../common/FormField';
import { useForm } from '../../hooks/useForm';
import { benchmarkFilterSchema } from '../../validation/benchmark.schema';
import { BenchmarkFilter, MetricType, TimeGranularity } from '../../types/benchmark.types';

interface BenchmarkFilterFormProps {
  onSubmit: (filter: BenchmarkFilter) => Promise<void>;
  initialValues?: Partial<BenchmarkFilter>;
  isLoading?: boolean;
  onCancel?: () => void;
}

const defaultValues: BenchmarkFilter = {
  revenue_range: {
    min: 0,
    max: 0,
    currency: 'USD'
  },
  metric_types: [],
  date_range: {
    start: new Date(),
    end: new Date()
  },
  industries: [],
  source_preference: [],
  exclusion_criteria: {
    outliers: false,
    incomplete_data: false,
    low_confidence_scores: false,
    minimum_sample_size: 30
  },
  time_granularity: TimeGranularity.QUARTERLY,
  confidence_threshold: 0.8
};

const REVENUE_RANGES = [
  { label: '$0 - $1M', min: 0, max: 1000000 },
  { label: '$1M - $5M', min: 1000000, max: 5000000 },
  { label: '$5M - $10M', min: 5000000, max: 10000000 },
  { label: '$10M - $50M', min: 10000000, max: 50000000 },
  { label: '$50M+', min: 50000000, max: Infinity }
];

const INDUSTRIES = [
  'SaaS',
  'E-commerce',
  'Fintech',
  'Healthcare',
  'Enterprise Software',
  'Consumer Tech'
];

export const BenchmarkFilterForm: React.FC<BenchmarkFilterFormProps> = React.memo(({
  onSubmit,
  initialValues = {},
  isLoading = false,
  onCancel
}) => {
  const {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue
  } = useForm<BenchmarkFilter>(
    benchmarkFilterSchema,
    { ...defaultValues, ...initialValues },
    onSubmit,
    {
      validateOnChange: true,
      validateOnBlur: true
    }
  );

  const handleMetricTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFieldValue('metric_types', event.target.value as MetricType[]);
  };

  const handleIndustryChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFieldValue('industries', event.target.value as string[]);
  };

  const handleDateChange = (field: 'start' | 'end') => (date: Date | null) => {
    if (date) {
      setFieldValue('date_range', { ...values.date_range, [field]: date });
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Benchmark filter form">
      <Grid container spacing={3}>
        {/* Revenue Range Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={touched.revenue_range && Boolean(errors.revenue_range)}>
            <InputLabel id="revenue-range-label">Revenue Range</InputLabel>
            <Select
              labelId="revenue-range-label"
              id="revenue-range"
              value={values.revenue_range}
              onChange={(e) => handleChange('revenue_range', e.target.value)}
              onBlur={() => handleBlur('revenue_range')}
              aria-describedby="revenue-range-helper-text"
            >
              {REVENUE_RANGES.map((range) => (
                <MenuItem key={range.label} value={range}>
                  {range.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Metric Types Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth error={touched.metric_types && Boolean(errors.metric_types)}>
            <InputLabel id="metric-types-label">Metric Types</InputLabel>
            <Select
              labelId="metric-types-label"
              id="metric-types"
              multiple
              value={values.metric_types}
              onChange={handleMetricTypeChange}
              onBlur={() => handleBlur('metric_types')}
              renderValue={(selected) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(selected as MetricType[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </div>
              )}
            >
              {Object.values(MetricType).map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Date Range Selection */}
        <Grid item xs={12} md={6}>
          <DatePicker
            label="Start Date"
            value={values.date_range.start}
            onChange={handleDateChange('start')}
            slotProps={{
              textField: {
                fullWidth: true,
                error: touched.date_range?.start && Boolean(errors.date_range?.start)
              }
            }}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <DatePicker
            label="End Date"
            value={values.date_range.end}
            onChange={handleDateChange('end')}
            slotProps={{
              textField: {
                fullWidth: true,
                error: touched.date_range?.end && Boolean(errors.date_range?.end)
              }
            }}
          />
        </Grid>

        {/* Industries Selection */}
        <Grid item xs={12}>
          <FormControl fullWidth error={touched.industries && Boolean(errors.industries)}>
            <InputLabel id="industries-label">Industries</InputLabel>
            <Select
              labelId="industries-label"
              id="industries"
              multiple
              value={values.industries}
              onChange={handleIndustryChange}
              onBlur={() => handleBlur('industries')}
              renderValue={(selected) => (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(selected as string[]).map((value) => (
                    <Chip key={value} label={value} size="small" />
                  ))}
                </div>
              )}
            >
              {INDUSTRIES.map((industry) => (
                <MenuItem key={industry} value={industry}>
                  {industry}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Time Granularity */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel id="time-granularity-label">Time Granularity</InputLabel>
            <Select
              labelId="time-granularity-label"
              id="time-granularity"
              value={values.time_granularity}
              onChange={(e) => handleChange('time_granularity', e.target.value)}
              onBlur={() => handleBlur('time_granularity')}
            >
              {Object.values(TimeGranularity).map((granularity) => (
                <MenuItem key={granularity} value={granularity}>
                  {granularity}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Confidence Threshold */}
        <Grid item xs={12} md={6}>
          <FormField
            name="confidence_threshold"
            label="Confidence Threshold"
            value={values.confidence_threshold.toString()}
            type="number"
            error={touched.confidence_threshold ? errors.confidence_threshold : undefined}
            onChange={(value) => handleChange('confidence_threshold', parseFloat(value))}
            onBlur={() => handleBlur('confidence_threshold')}
            validationType="percentage"
          />
        </Grid>

        {/* Form Actions */}
        <Grid item xs={12} container justifyContent="flex-end" spacing={2}>
          {onCancel && (
            <Grid item>
              <Button
                onClick={onCancel}
                disabled={isLoading}
                variant="outlined"
                color="secondary"
              >
                Cancel
              </Button>
            </Grid>
          )}
          <Grid item>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
            >
              {isLoading ? 'Applying Filters...' : 'Apply Filters'}
            </Button>
          </Grid>
        </Grid>
      </Grid>
    </form>
  );
});

BenchmarkFilterForm.displayName = 'BenchmarkFilterForm';

export default BenchmarkFilterForm;