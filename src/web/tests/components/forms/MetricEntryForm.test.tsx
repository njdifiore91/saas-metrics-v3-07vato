import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react'; // @testing-library/react v14.0.0
import { describe, it, expect, jest } from '@jest/globals'; // @jest/globals v29.6.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // @axe-core/react v4.7.0

import MetricEntryForm from '../../../../src/components/forms/MetricEntryForm';
import { MetricDataType } from '../../../../src/types/metric.types';

expect.extend(toHaveNoViolations);

// Helper function to render form with test props
const renderMetricEntryForm = (props = {}, options = {}) => {
  const defaultProps = {
    companyId: '123e4567-e89b-12d3-a456-426614174000',
    metricId: '987fcdeb-51a2-43d7-9876-543210987654',
    dataType: MetricDataType.PERCENTAGE,
    validationRules: [{
      min: 0,
      max: 200,
      precision: 2,
      required: true
    }],
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    autoSave: true,
    autoSaveInterval: 3000,
    onValidationError: jest.fn()
  };

  return render(
    <MetricEntryForm {...defaultProps} {...props} />,
    options
  );
};

describe('MetricEntryForm Component', () => {
  describe('Rendering', () => {
    it('should render all form fields with correct attributes', () => {
      renderMetricEntryForm();

      expect(screen.getByLabelText(/metric value/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/period start/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/period end/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should initialize with correct ARIA attributes', () => {
      renderMetricEntryForm();
      
      const form = screen.getByRole('form');
      expect(form).toHaveAttribute('aria-label', 'Metric Entry Form');
      expect(form).toHaveAttribute('noValidate');
    });

    it('should be accessible according to WCAG 2.1 Level AA', async () => {
      const { container } = renderMetricEntryForm();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Metric Value Validation', () => {
    it('should validate percentage values within range', async () => {
      const onValidationError = jest.fn();
      renderMetricEntryForm({ 
        dataType: MetricDataType.PERCENTAGE,
        onValidationError 
      });

      const input = screen.getByLabelText(/metric value/i);
      fireEvent.change(input, { target: { value: '250' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/percentage cannot exceed 200/i)).toBeInTheDocument();
        expect(onValidationError).toHaveBeenCalled();
      });
    });

    it('should enforce decimal precision limits', async () => {
      renderMetricEntryForm({
        dataType: MetricDataType.CURRENCY,
        validationRules: [{ precision: 2, required: true }]
      });

      const input = screen.getByLabelText(/metric value/i);
      fireEvent.change(input, { target: { value: '100.999' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/must have at most 2 decimal places/i)).toBeInTheDocument();
      });
    });

    it('should validate required fields', async () => {
      renderMetricEntryForm();
      
      const input = screen.getByLabelText(/metric value/i);
      fireEvent.change(input, { target: { value: '' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/this field is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Date Input Validation', () => {
    it('should validate period start and end dates', async () => {
      renderMetricEntryForm();

      const startDate = screen.getByLabelText(/period start/i);
      const endDate = screen.getByLabelText(/period end/i);

      fireEvent.change(startDate, { target: { value: '2023-12-01' } });
      fireEvent.change(endDate, { target: { value: '2023-11-01' } });

      await waitFor(() => {
        expect(screen.getByText(/period end date must be after period start date/i)).toBeInTheDocument();
      });
    });

    it('should prevent future dates', async () => {
      renderMetricEntryForm();

      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const input = screen.getByLabelText(/period end/i);
      fireEvent.change(input, { target: { value: futureDate.toISOString().split('T')[0] } });

      await waitFor(() => {
        expect(screen.getByText(/date cannot be in the future/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should handle successful form submission', async () => {
      const onSubmit = jest.fn();
      renderMetricEntryForm({ onSubmit });

      fireEvent.change(screen.getByLabelText(/metric value/i), { target: { value: '100' } });
      fireEvent.change(screen.getByLabelText(/period start/i), { target: { value: '2023-01-01' } });
      fireEvent.change(screen.getByLabelText(/period end/i), { target: { value: '2023-12-31' } });

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
          value: 100,
          periodStart: expect.any(Date),
          periodEnd: expect.any(Date)
        }));
      });
    });

    it('should handle form cancellation', () => {
      const onCancel = jest.fn();
      renderMetricEntryForm({ onCancel });

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Auto-save Functionality', () => {
    it('should trigger auto-save after changes', async () => {
      jest.useFakeTimers();
      const onAutoSave = jest.fn();
      
      renderMetricEntryForm({ 
        autoSave: true,
        autoSaveInterval: 1000,
        onAutoSave
      });

      fireEvent.change(screen.getByLabelText(/metric value/i), { target: { value: '50' } });
      
      jest.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(onAutoSave).toHaveBeenCalled();
      });

      jest.useRealTimers();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation between fields', () => {
      renderMetricEntryForm();
      
      const valueInput = screen.getByLabelText(/metric value/i);
      fireEvent.keyDown(valueInput, { key: 'Tab' });
      
      expect(screen.getByLabelText(/period start/i)).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors inline', async () => {
      renderMetricEntryForm();
      
      const input = screen.getByLabelText(/metric value/i);
      fireEvent.change(input, { target: { value: '-1' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByText(/value must be greater than 0/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button when form has errors', async () => {
      renderMetricEntryForm();
      
      const input = screen.getByLabelText(/metric value/i);
      fireEvent.change(input, { target: { value: '-1' } });
      fireEvent.blur(input);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
      });
    });
  });
});