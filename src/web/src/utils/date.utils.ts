import { format, isValid, isBefore, isAfter, addMonths, subMonths } from 'date-fns'; // ^2.30.0

// Types for function parameters and returns
interface ValidationOptions {
  allowFutureDates?: boolean;
  maxRangeMonths?: number;
  fiscalYearStart?: number; // 1-12 representing month
  requireBusinessDays?: boolean;
  timezone?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface PeriodOptions {
  fiscalYearStartMonth?: number;
  timezone?: string;
  customRangeMonths?: number;
}

interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  isValid: boolean;
  periodType: string;
}

type PeriodType = 'month' | 'quarter' | 'year' | 'fiscal-year' | 'custom';

/**
 * Formats a date into a standardized string format for display and API operations
 * @param date - Date to format
 * @param formatString - Format string following date-fns format
 * @returns Formatted date string or empty string if invalid
 */
export const formatDate = (date: Date | string | null, formatString: string): string => {
  if (!date) {
    return '';
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (!isValid(dateObj)) {
    return '';
  }

  try {
    return format(dateObj, formatString);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '';
  }
};

/**
 * Validates a date range for metric periods and benchmark comparisons
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param options - Validation options
 * @returns Validation result with boolean and error messages
 */
export const isValidDateRange = (
  startDate: Date | null,
  endDate: Date | null,
  options: ValidationOptions = {}
): ValidationResult => {
  const errors: string[] = [];
  
  // Check for null dates
  if (!startDate || !endDate) {
    errors.push('Both start and end dates are required');
    return { isValid: false, errors };
  }

  // Validate date objects
  if (!isValid(startDate) || !isValid(endDate)) {
    errors.push('Invalid date format');
    return { isValid: false, errors };
  }

  // Check date order
  if (!isBefore(startDate, endDate)) {
    errors.push('Start date must be before end date');
  }

  // Check maximum range
  const maxMonths = options.maxRangeMonths || 12;
  const monthsDiff = Math.abs(
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth())
  );
  if (monthsDiff > maxMonths) {
    errors.push(`Date range cannot exceed ${maxMonths} months`);
  }

  // Check future dates if restricted
  if (!options.allowFutureDates) {
    const today = new Date();
    if (isAfter(endDate, today) || isAfter(startDate, today)) {
      errors.push('Future dates are not allowed');
    }
  }

  // Validate fiscal year boundaries if applicable
  if (options.fiscalYearStart) {
    const fiscalYearValid = validateFiscalYearBoundaries(
      startDate,
      endDate,
      options.fiscalYearStart
    );
    if (!fiscalYearValid) {
      errors.push('Dates must be within the same fiscal year');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculates start and end dates for various period types
 * @param periodType - Type of period to calculate
 * @param referenceDate - Reference date for calculations
 * @param options - Period calculation options
 * @returns Date range result with period metadata
 */
export const getDateRangeForPeriod = (
  periodType: PeriodType,
  referenceDate: Date,
  options: PeriodOptions = {}
): DateRangeResult => {
  if (!isValid(referenceDate)) {
    return {
      startDate: new Date(),
      endDate: new Date(),
      isValid: false,
      periodType
    };
  }

  let startDate: Date;
  let endDate: Date;

  switch (periodType) {
    case 'month':
      startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
      break;

    case 'quarter':
      const quarterStartMonth = Math.floor(referenceDate.getMonth() / 3) * 3;
      startDate = new Date(referenceDate.getFullYear(), quarterStartMonth, 1);
      endDate = new Date(referenceDate.getFullYear(), quarterStartMonth + 3, 0);
      break;

    case 'year':
      startDate = new Date(referenceDate.getFullYear(), 0, 1);
      endDate = new Date(referenceDate.getFullYear(), 11, 31);
      break;

    case 'fiscal-year':
      const fiscalStartMonth = options.fiscalYearStartMonth || 1;
      startDate = new Date(referenceDate.getFullYear(), fiscalStartMonth - 1, 1);
      if (referenceDate.getMonth() < fiscalStartMonth - 1) {
        startDate = new Date(referenceDate.getFullYear() - 1, fiscalStartMonth - 1, 1);
      }
      endDate = new Date(startDate.getFullYear() + 1, fiscalStartMonth - 1, 0);
      break;

    case 'custom':
      const rangeMonths = options.customRangeMonths || 1;
      startDate = new Date(referenceDate);
      endDate = addMonths(startDate, rangeMonths);
      break;

    default:
      return {
        startDate: new Date(),
        endDate: new Date(),
        isValid: false,
        periodType: 'invalid'
      };
  }

  return {
    startDate,
    endDate,
    isValid: true,
    periodType
  };
};

/**
 * Checks if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future
 */
export const isFutureDate = (date: Date): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isAfter(date, today);
};

/**
 * Helper function to validate fiscal year boundaries
 * @param startDate - Start date of the range
 * @param endDate - End date of the range
 * @param fiscalYearStartMonth - Month when fiscal year starts (1-12)
 * @returns True if dates are within same fiscal year
 */
const validateFiscalYearBoundaries = (
  startDate: Date,
  endDate: Date,
  fiscalYearStartMonth: number
): boolean => {
  const getFiscalYear = (date: Date): number => {
    const month = date.getMonth() + 1;
    return date.getFullYear() + (month < fiscalYearStartMonth ? -1 : 0);
  };

  return getFiscalYear(startDate) === getFiscalYear(endDate);
};