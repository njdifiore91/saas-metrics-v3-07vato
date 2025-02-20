// External imports
import { useState, useCallback, useRef, useEffect } from 'react'; // react v18.2.0
import { z } from 'zod'; // zod v3.22.0
import debounce from 'lodash/debounce'; // lodash v4.17.21

// Internal imports
import { ValidationError } from '../types/api.types';

// Types for form hook options
interface UseFormOptions<T> {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  autoSave?: boolean;
  autoSaveDelay?: number;
  transformValues?: (values: T) => T;
  onAutoSave?: (values: T) => Promise<void>;
}

// Types for form state management
interface FormState<T> {
  values: T;
  errors: Record<string, ValidationError>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  isValidating: boolean;
}

/**
 * Custom hook for comprehensive form state management with Zod schema validation
 * @param schema - Zod schema for form validation
 * @param initialValues - Initial form values
 * @param onSubmit - Form submission handler
 * @param options - Form configuration options
 */
export function useForm<T extends Record<string, any>>(
  schema: z.ZodSchema<T>,
  initialValues: T,
  onSubmit: (values: T) => Promise<void>,
  options: UseFormOptions<T> = {}
) {
  // Destructure options with defaults
  const {
    validateOnChange = true,
    validateOnBlur = true,
    autoSave = false,
    autoSaveDelay = 1000,
    transformValues = (v: T) => v,
    onAutoSave
  } = options;

  // Initialize form state
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isDirty: false,
    isValid: true,
    isSubmitting: false,
    isValidating: false
  });

  // Refs for tracking mounted state and previous values
  const isMounted = useRef(true);
  const previousValues = useRef(initialValues);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Validates the entire form or a specific field
   * @param fieldPath - Optional field path for single field validation
   */
  const validateForm = useCallback(async (fieldPath?: string): Promise<boolean> => {
    setFormState(prev => ({ ...prev, isValidating: true }));

    try {
      const validationResult = await schema.safeParseAsync(formState.values);

      if (validationResult.success) {
        setFormState(prev => ({
          ...prev,
          errors: {},
          isValid: true,
          isValidating: false
        }));
        return true;
      }

      const newErrors: Record<string, ValidationError> = {};
      validationResult.error.errors.forEach(error => {
        if (!fieldPath || error.path.join('.') === fieldPath) {
          newErrors[error.path.join('.')] = {
            path: error.path,
            message: error.message,
            code: error.code
          };
        }
      });

      setFormState(prev => ({
        ...prev,
        errors: fieldPath ? { ...prev.errors, ...newErrors } : newErrors,
        isValid: Object.keys(newErrors).length === 0,
        isValidating: false
      }));

      return false;
    } catch (error) {
      setFormState(prev => ({
        ...prev,
        isValid: false,
        isValidating: false
      }));
      return false;
    }
  }, [schema, formState.values]);

  // Debounced validation for performance
  const debouncedValidation = useCallback(
    debounce(validateForm, 300),
    [validateForm]
  );

  /**
   * Handles field value changes with validation
   * @param field - Field path
   * @param value - New field value
   */
  const handleChange = useCallback(async (
    field: string,
    value: any
  ) => {
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value
      },
      touched: {
        ...prev.touched,
        [field]: true
      },
      isDirty: true
    }));

    if (validateOnChange) {
      await debouncedValidation(field);
    }

    if (autoSave && onAutoSave) {
      const debouncedAutoSave = debounce(async () => {
        if (isMounted.current) {
          await onAutoSave(transformValues(formState.values));
        }
      }, autoSaveDelay);
      debouncedAutoSave();
    }
  }, [
    validateOnChange,
    debouncedValidation,
    autoSave,
    autoSaveDelay,
    onAutoSave,
    transformValues
  ]);

  /**
   * Handles field blur events with validation
   * @param field - Field path
   */
  const handleBlur = useCallback(async (field: string) => {
    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: true
      }
    }));

    if (validateOnBlur) {
      await validateForm(field);
    }
  }, [validateOnBlur, validateForm]);

  /**
   * Handles form submission with validation
   * @param e - Form event
   */
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    const isValid = await validateForm();
    if (!isValid) {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
      return;
    }

    try {
      const transformedValues = transformValues(formState.values);
      await onSubmit(transformedValues);
      
      setFormState(prev => ({
        ...prev,
        isDirty: false,
        isSubmitting: false
      }));
      
      previousValues.current = formState.values;
    } catch (error) {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
      throw error;
    }
  }, [formState.values, validateForm, onSubmit, transformValues]);

  /**
   * Resets form to initial state
   */
  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isDirty: false,
      isValid: true,
      isSubmitting: false,
      isValidating: false
    });
    previousValues.current = initialValues;
  }, [initialValues]);

  /**
   * Sets a specific field value
   * @param field - Field path
   * @param value - New field value
   */
  const setFieldValue = useCallback((field: string, value: any) => {
    handleChange(field, value);
  }, [handleChange]);

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isDirty: formState.isDirty,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    isValidating: formState.isValidating,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setFieldValue,
    validateField: (field: string) => validateForm(field),
    validateForm
  };
}