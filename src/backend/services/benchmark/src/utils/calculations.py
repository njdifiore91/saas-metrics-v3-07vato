"""
Utility module for statistical calculations and data processing of benchmark metrics.
Implements standardized formulas with comprehensive validation and statistical analysis.

Version: 1.0.0
"""

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from typing import List, Dict, Optional, Union
import numpy as np  # v1.24.0
import pandas as pd  # v2.0.0
from models.benchmark_model import BenchmarkModel

# Constants for validation
MIN_NDR = Decimal('0')
MAX_NDR = Decimal('200')
MIN_MAGIC_NUMBER = Decimal('0')
MAX_MAGIC_NUMBER = Decimal('10')
MIN_CAC_PAYBACK = Decimal('0')
MAX_CAC_PAYBACK = Decimal('60')
DECIMAL_PRECISION = Decimal('0.0001')

class MetricValidationError(Exception):
    """Custom exception for metric validation errors"""
    pass

def calculate_net_dollar_retention(
    starting_arr: Decimal,
    expansions: Decimal,
    contractions: Decimal,
    churn: Decimal
) -> Decimal:
    """
    Calculates Net Dollar Retention (NDR) with comprehensive validation.
    
    Args:
        starting_arr: Starting Annual Recurring Revenue
        expansions: Revenue from customer expansions
        contractions: Revenue lost from downgrades
        churn: Revenue lost from customer churn
    
    Returns:
        Decimal: NDR as a percentage (0-200%)
    
    Raises:
        MetricValidationError: If inputs are invalid or result is out of bounds
    """
    try:
        # Validate inputs are non-negative
        for value, name in [
            (starting_arr, 'starting_arr'),
            (expansions, 'expansions'),
            (contractions, 'contractions'),
            (churn, 'churn')
        ]:
            if not isinstance(value, Decimal):
                raise MetricValidationError(f"{name} must be a Decimal value")
            if value < 0:
                raise MetricValidationError(f"{name} cannot be negative")

        if starting_arr == 0:
            raise MetricValidationError("starting_arr must be greater than zero")

        # Calculate NDR
        ndr = ((starting_arr + expansions - contractions - churn) / starting_arr) * Decimal('100')
        ndr = ndr.quantize(DECIMAL_PRECISION, rounding=ROUND_HALF_UP)

        # Validate result bounds
        if not MIN_NDR <= ndr <= MAX_NDR:
            raise MetricValidationError(f"NDR must be between {MIN_NDR}% and {MAX_NDR}%")

        return ndr

    except InvalidOperation as e:
        raise MetricValidationError(f"Invalid decimal operation: {str(e)}")

def calculate_magic_number(
    net_new_arr: Decimal,
    sales_marketing_spend: Decimal
) -> Decimal:
    """
    Calculates the Magic Number metric for sales efficiency.
    
    Args:
        net_new_arr: Net new Annual Recurring Revenue
        sales_marketing_spend: Sales and Marketing spend from previous quarter
    
    Returns:
        Decimal: Magic Number value (0-10)
    
    Raises:
        MetricValidationError: If inputs are invalid or result is out of bounds
    """
    try:
        # Validate inputs
        for value, name in [
            (net_new_arr, 'net_new_arr'),
            (sales_marketing_spend, 'sales_marketing_spend')
        ]:
            if not isinstance(value, Decimal):
                raise MetricValidationError(f"{name} must be a Decimal value")
            if value < 0:
                raise MetricValidationError(f"{name} cannot be negative")

        if sales_marketing_spend == 0:
            raise MetricValidationError("sales_marketing_spend must be greater than zero")

        # Calculate Magic Number
        magic_number = (net_new_arr / sales_marketing_spend).quantize(
            DECIMAL_PRECISION, 
            rounding=ROUND_HALF_UP
        )

        # Validate result bounds
        if not MIN_MAGIC_NUMBER <= magic_number <= MAX_MAGIC_NUMBER:
            raise MetricValidationError(
                f"Magic Number must be between {MIN_MAGIC_NUMBER} and {MAX_MAGIC_NUMBER}"
            )

        return magic_number

    except InvalidOperation as e:
        raise MetricValidationError(f"Invalid decimal operation: {str(e)}")

def calculate_cac_payback(
    cac: Decimal,
    arpa: Decimal,
    gross_margin: Decimal
) -> Decimal:
    """
    Calculates Customer Acquisition Cost (CAC) Payback Period.
    
    Args:
        cac: Customer Acquisition Cost
        arpa: Average Revenue Per Account
        gross_margin: Gross Margin as decimal (0-1)
    
    Returns:
        Decimal: CAC Payback period in months (0-60)
    
    Raises:
        MetricValidationError: If inputs are invalid or result is out of bounds
    """
    try:
        # Validate inputs
        for value, name in [(cac, 'cac'), (arpa, 'arpa'), (gross_margin, 'gross_margin')]:
            if not isinstance(value, Decimal):
                raise MetricValidationError(f"{name} must be a Decimal value")
            if value < 0:
                raise MetricValidationError(f"{name} cannot be negative")

        if not 0 < gross_margin <= 1:
            raise MetricValidationError("gross_margin must be between 0 and 1")

        if arpa * gross_margin == 0:
            raise MetricValidationError("Product of ARPA and gross_margin must be greater than zero")

        # Calculate CAC Payback in months
        payback_months = (cac / (arpa * gross_margin) * Decimal('12')).quantize(
            DECIMAL_PRECISION,
            rounding=ROUND_HALF_UP
        )

        # Validate result bounds
        if not MIN_CAC_PAYBACK <= payback_months <= MAX_CAC_PAYBACK:
            raise MetricValidationError(
                f"CAC Payback must be between {MIN_CAC_PAYBACK} and {MAX_CAC_PAYBACK} months"
            )

        return payback_months

    except InvalidOperation as e:
        raise MetricValidationError(f"Invalid decimal operation: {str(e)}")

def calculate_benchmark_statistics(
    benchmark_data: List[BenchmarkModel],
    revenue_range: str,
    metric_name: str
) -> Dict[str, Union[float, int, Dict]]:
    """
    Calculates comprehensive statistical measures for benchmark data with outlier detection.
    
    Args:
        benchmark_data: List of benchmark data points
        revenue_range: Revenue range filter
        metric_name: Name of the metric being analyzed
    
    Returns:
        Dict containing statistical measures including:
            - mean, median, std_dev
            - percentiles (25th, 75th, 90th)
            - outlier information
            - sample size and confidence intervals
    
    Raises:
        MetricValidationError: If input data is invalid or insufficient
    """
    if not benchmark_data:
        raise MetricValidationError("Empty benchmark data provided")

    try:
        # Filter data by revenue range and convert to numpy array
        filtered_data = [
            float(b.value) for b in benchmark_data 
            if b.revenue_range == revenue_range
        ]
        
        if len(filtered_data) < 3:
            raise MetricValidationError(
                f"Insufficient data points for revenue range {revenue_range}"
            )

        data_array = np.array(filtered_data)
        
        # Calculate basic statistics
        mean = float(np.mean(data_array))
        median = float(np.median(data_array))
        std_dev = float(np.std(data_array, ddof=1))
        
        # Calculate percentiles
        p25, p75, p90 = np.percentile(data_array, [25, 75, 90])
        
        # Calculate IQR and identify outliers
        iqr = p75 - p25
        lower_bound = p25 - (1.5 * iqr)
        upper_bound = p75 + (1.5 * iqr)
        outliers = data_array[(data_array < lower_bound) | (data_array > upper_bound)]
        
        # Calculate confidence interval (95%)
        confidence_interval = (
            mean - (1.96 * std_dev / np.sqrt(len(data_array))),
            mean + (1.96 * std_dev / np.sqrt(len(data_array)))
        )

        return {
            'mean': mean,
            'median': median,
            'std_dev': std_dev,
            'percentiles': {
                'p25': float(p25),
                'p75': float(p75),
                'p90': float(p90)
            },
            'outliers': {
                'count': len(outliers),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound)
            },
            'sample_size': len(data_array),
            'confidence_interval': {
                'lower': float(confidence_interval[0]),
                'upper': float(confidence_interval[1])
            },
            'iqr': float(iqr)
        }

    except Exception as e:
        raise MetricValidationError(f"Error calculating statistics: {str(e)}")