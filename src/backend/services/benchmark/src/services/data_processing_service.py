"""
Data Processing Service for Benchmark Data
Version: 1.0.0

Handles processing, validation, and statistical analysis of benchmark data with 
enhanced caching and outlier detection capabilities.
"""

import pandas as pd  # v2.0.0
import numpy as np  # v1.24.0
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
import logging
from models.benchmark_model import BenchmarkModel
from utils.calculations import calculate_benchmark_statistics, MetricValidationError

class DataProcessingService:
    """Service class for processing benchmark data with enhanced validation and caching."""
    
    def __init__(self):
        """Initialize the data processing service with cache and configurations."""
        self._data_frame: Optional[pd.DataFrame] = None
        self._cache: Dict[str, Any] = {}
        self._cache_ttl = timedelta(hours=1)
        
        # Configure logging
        self._logger = logging.getLogger(__name__)
        
        # Statistical thresholds for outlier detection
        self._outlier_threshold = 1.5  # IQR multiplier
        self._min_sample_size = 3
        
        # Initialize cache cleanup
        self._last_cache_cleanup = datetime.now()
        self._cache_cleanup_interval = timedelta(hours=6)

    def process_benchmark_data(self, benchmark_data: List[BenchmarkModel]) -> pd.DataFrame:
        """
        Process raw benchmark data with comprehensive validation and normalization.
        
        Args:
            benchmark_data: List of BenchmarkModel instances
            
        Returns:
            pd.DataFrame: Processed and validated benchmark data
            
        Raises:
            ValueError: If input data is invalid or processing fails
        """
        try:
            self._logger.info(f"Processing {len(benchmark_data)} benchmark records")
            
            # Input validation
            if not benchmark_data:
                raise ValueError("Empty benchmark data provided")
            
            # Convert to DataFrame
            df = pd.DataFrame([model.to_dict() for model in benchmark_data])
            
            # Basic data validation
            required_columns = ['id', 'metric_id', 'source_id', 'revenue_range', 'value', 
                              'period_start', 'period_end']
            missing_columns = set(required_columns) - set(df.columns)
            if missing_columns:
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            # Remove duplicates
            df = df.drop_duplicates(subset=['id'], keep='last')
            
            # Validate date ranges
            df['period_duration'] = (pd.to_datetime(df['period_end']) - 
                                   pd.to_datetime(df['period_start'])).dt.days
            invalid_periods = df[df['period_duration'] <= 0]
            if not invalid_periods.empty:
                self._logger.warning(f"Found {len(invalid_periods)} invalid period ranges")
                df = df[df['period_duration'] > 0]
            
            # Validate numeric values
            df['value'] = pd.to_numeric(df['value'], errors='coerce')
            df = df.dropna(subset=['value'])
            
            # Outlier detection using IQR method
            Q1 = df['value'].quantile(0.25)
            Q3 = df['value'].quantile(0.75)
            IQR = Q3 - Q1
            outlier_mask = (
                (df['value'] < (Q1 - self._outlier_threshold * IQR)) | 
                (df['value'] > (Q3 + self._outlier_threshold * IQR))
            )
            outliers = df[outlier_mask]
            if not outliers.empty:
                self._logger.warning(f"Detected {len(outliers)} outliers")
                df = df[~outlier_mask]
            
            # Store processed DataFrame
            self._data_frame = df
            
            # Log processing summary
            self._logger.info(
                f"Processing complete. Records: {len(df)}, "
                f"Outliers removed: {len(outliers)}, "
                f"Invalid periods removed: {len(invalid_periods)}"
            )
            
            return df
            
        except Exception as e:
            self._logger.error(f"Error processing benchmark data: {str(e)}")
            raise ValueError(f"Failed to process benchmark data: {str(e)}")

    def calculate_statistics(
        self, 
        revenue_range: str, 
        metric_name: str
    ) -> Dict[str, float]:
        """
        Calculate statistical measures with caching for performance optimization.
        
        Args:
            revenue_range: Revenue range filter
            metric_name: Target metric name
            
        Returns:
            Dict containing statistical measures
            
        Raises:
            ValueError: If calculation fails or insufficient data
        """
        try:
            # Check cache
            cache_key = f"{revenue_range}_{metric_name}"
            if cache_key in self._cache:
                cache_entry = self._cache[cache_key]
                if datetime.now() - cache_entry['timestamp'] < self._cache_ttl:
                    return cache_entry['data']
            
            # Validate data availability
            if self._data_frame is None:
                raise ValueError("No processed data available")
                
            # Filter data
            filtered_data = self._data_frame[
                (self._data_frame['revenue_range'] == revenue_range) & 
                (self._data_frame['metric_id'] == metric_name)
            ]
            
            if len(filtered_data) < self._min_sample_size:
                raise ValueError(
                    f"Insufficient data points for {revenue_range} and {metric_name}"
                )
            
            # Calculate statistics
            stats = calculate_benchmark_statistics(
                [BenchmarkModel.from_dict(row) for _, row in filtered_data.iterrows()],
                revenue_range,
                metric_name
            )
            
            # Cache results
            self._cache[cache_key] = {
                'data': stats,
                'timestamp': datetime.now()
            }
            
            # Cleanup cache if needed
            self._cleanup_cache()
            
            return stats
            
        except Exception as e:
            self._logger.error(f"Error calculating statistics: {str(e)}")
            raise ValueError(f"Failed to calculate statistics: {str(e)}")

    def filter_by_revenue_range(self, revenue_range: str) -> pd.DataFrame:
        """
        Filter benchmark data by revenue range with validation.
        
        Args:
            revenue_range: Target revenue range
            
        Returns:
            pd.DataFrame: Filtered benchmark data
            
        Raises:
            ValueError: If filtering fails or invalid range
        """
        try:
            if self._data_frame is None:
                raise ValueError("No processed data available")
                
            if not revenue_range:
                raise ValueError("Revenue range must be specified")
                
            filtered_df = self._data_frame[
                self._data_frame['revenue_range'] == revenue_range
            ].copy()
            
            if filtered_df.empty:
                raise ValueError(f"No data found for revenue range: {revenue_range}")
                
            return filtered_df
            
        except Exception as e:
            self._logger.error(f"Error filtering by revenue range: {str(e)}")
            raise ValueError(f"Failed to filter by revenue range: {str(e)}")

    def normalize_metric_values(self, metric_name: str) -> pd.Series:
        """
        Normalize metric values with enhanced outlier detection.
        
        Args:
            metric_name: Target metric name
            
        Returns:
            pd.Series: Normalized metric values
            
        Raises:
            ValueError: If normalization fails
        """
        try:
            if self._data_frame is None:
                raise ValueError("No processed data available")
                
            metric_data = self._data_frame[
                self._data_frame['metric_id'] == metric_name
            ]['value']
            
            if metric_data.empty:
                raise ValueError(f"No data found for metric: {metric_name}")
                
            # Remove outliers using IQR method
            Q1 = metric_data.quantile(0.25)
            Q3 = metric_data.quantile(0.75)
            IQR = Q3 - Q1
            
            clean_data = metric_data[
                (metric_data >= Q1 - self._outlier_threshold * IQR) &
                (metric_data <= Q3 + self._outlier_threshold * IQR)
            ]
            
            # Normalize using robust scaling
            normalized = (clean_data - clean_data.median()) / (Q3 - Q1)
            
            return normalized
            
        except Exception as e:
            self._logger.error(f"Error normalizing metric values: {str(e)}")
            raise ValueError(f"Failed to normalize metric values: {str(e)}")

    def _cleanup_cache(self) -> None:
        """Perform cache cleanup based on TTL."""
        current_time = datetime.now()
        if current_time - self._last_cache_cleanup > self._cache_cleanup_interval:
            expired_keys = [
                key for key, value in self._cache.items()
                if current_time - value['timestamp'] > self._cache_ttl
            ]
            for key in expired_keys:
                del self._cache[key]
            self._last_cache_cleanup = current_time