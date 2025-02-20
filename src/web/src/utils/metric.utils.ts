import Big from 'big.js';
import { 
  MetricCategory,
  MetricDataType,
  MetricValidationRule
} from '../types/metric.types';

/**
 * Configuration for decimal precision and rounding in Big.js
 * Using banker's rounding (ROUND_HALF_EVEN) for financial calculations
 */
Big.DP = 10;
Big.RM = Big.roundHalfEven;

/**
 * Formats a metric value based on its data type with comprehensive formatting rules
 * @param value - The numeric value to format
 * @param dataType - The metric's data type
 * @param rules - Validation rules containing precision requirements
 * @returns Formatted string representation of the metric value
 * @throws Error if value cannot be converted to a valid number
 */
export const formatMetricValue = (
  value: number | null | undefined,
  dataType: MetricDataType,
  rules: MetricValidationRule
): string => {
  if (value === null || value === undefined) {
    return '—';
  }

  try {
    const bigValue = new Big(value);
    const precision = rules.precision;

    switch (dataType) {
      case MetricDataType.PERCENTAGE:
        return `${bigValue.round(precision).toString()}%`;
      
      case MetricDataType.CURRENCY:
        return `$${bigValue.round(2).toFixed(2)}`;
      
      case MetricDataType.RATIO:
        return `${bigValue.round(precision).toString()}x`;
      
      case MetricDataType.MONTHS:
        return `${bigValue.round(0).toString()} mo`;
      
      case MetricDataType.NUMBER:
        return bigValue.round(precision).toString();
      
      default:
        throw new Error(`Unsupported metric data type: ${dataType}`);
    }
  } catch (error) {
    throw new Error(`Error formatting metric value: ${error.message}`);
  }
};

/**
 * Validates a metric value against comprehensive validation rules
 * @param value - The numeric value to validate
 * @param rules - Validation rules to check against
 * @param dataType - The metric's data type for type-specific validation
 * @returns Boolean indicating if the value is valid
 */
export const validateMetricValue = (
  value: number | null | undefined,
  rules: MetricValidationRule,
  dataType: MetricDataType
): boolean => {
  // Required field validation
  if (rules.required && (value === null || value === undefined)) {
    return false;
  }

  // Allow null/undefined for non-required fields
  if (!rules.required && (value === null || value === undefined)) {
    return true;
  }

  try {
    const bigValue = new Big(value!);

    // Range validation
    if (rules.min !== null && bigValue.lt(rules.min)) {
      return false;
    }
    if (rules.max !== null && bigValue.gt(rules.max)) {
      return false;
    }

    // Data type specific validation
    switch (dataType) {
      case MetricDataType.PERCENTAGE:
        return bigValue.gte(0) && bigValue.lte(100);
      
      case MetricDataType.CURRENCY:
        return bigValue.gte(0);
      
      case MetricDataType.RATIO:
        return bigValue.gt(0);
      
      case MetricDataType.MONTHS:
        return bigValue.gt(0) && bigValue.eq(bigValue.round(0));
      
      case MetricDataType.NUMBER:
        return true;
      
      default:
        return false;
    }
  } catch (error) {
    return false;
  }
};

/**
 * Calculates Net Dollar Retention (NDR) with precise decimal arithmetic
 * Formula: (Starting ARR + Expansions - Contractions - Churn) / Starting ARR * 100
 * @param startingARR - Starting Annual Recurring Revenue
 * @param expansions - Revenue from expansions
 * @param contractions - Revenue lost from contractions
 * @param churn - Revenue lost from churned customers
 * @returns NDR as a percentage
 * @throws Error for invalid inputs or calculation errors
 */
export const calculateNDR = (
  startingARR: number,
  expansions: number,
  contractions: number,
  churn: number
): number => {
  try {
    // Validate inputs are non-negative
    if (startingARR < 0 || expansions < 0 || contractions < 0 || churn < 0) {
      throw new Error('All inputs must be non-negative');
    }

    // Convert to Big instances for precise calculation
    const start = new Big(startingARR);
    const expand = new Big(expansions);
    const contract = new Big(contractions);
    const churnAmount = new Big(churn);

    // Validate starting ARR is greater than zero
    if (start.lte(0)) {
      throw new Error('Starting ARR must be greater than zero');
    }

    // Calculate NDR
    const endingARR = start.plus(expand).minus(contract).minus(churnAmount);
    const ndr = endingARR.div(start).times(100);

    // Round to 2 decimal places and convert to number
    return Number(ndr.round(2));
  } catch (error) {
    throw new Error(`Error calculating NDR: ${error.message}`);
  }
};

/**
 * Calculates Magic Number metric with precise decimal arithmetic
 * Formula: Net New ARR / Previous Quarter S&M Spend
 * @param netNewARR - Net new Annual Recurring Revenue
 * @param previousQuarterSMSpend - Sales & Marketing spend from previous quarter
 * @returns Magic Number ratio
 * @throws Error for invalid inputs or calculation errors
 */
export const calculateMagicNumber = (
  netNewARR: number,
  previousQuarterSMSpend: number
): number => {
  try {
    // Validate inputs are positive
    if (netNewARR < 0) {
      throw new Error('Net New ARR must be non-negative');
    }
    if (previousQuarterSMSpend <= 0) {
      throw new Error('Previous quarter S&M spend must be greater than zero');
    }

    // Convert to Big instances for precise calculation
    const arr = new Big(netNewARR);
    const spend = new Big(previousQuarterSMSpend);

    // Calculate Magic Number
    const magicNumber = arr.div(spend);

    // Round to 2 decimal places and convert to number
    return Number(magicNumber.round(2));
  } catch (error) {
    throw new Error(`Error calculating Magic Number: ${error.message}`);
  }
};