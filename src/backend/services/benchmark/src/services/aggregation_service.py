"""
Benchmark Aggregation Service
Version: 1.0.0

Provides comprehensive benchmark data aggregation and analysis with advanced caching,
error handling, and performance optimization.
"""

import pandas as pd  # v2.0.0
import numpy as np  # v1.24.0
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from models.benchmark_model import BenchmarkModel
from utils.calculations import calculate_benchmark_statistics, MetricValidationError
from services.data_processing_service import DataProcessingService

class BenchmarkAggregator:
    """
    Enhanced service class for aggregating and analyzing benchmark data with 
    caching and performance optimization.
    """
    
    def __init__(
        self,
        processed_data: pd.DataFrame,
        config: Optional[Dict] = None
    ):
        """
        Initialize the aggregator with processed benchmark data and configuration.
        
        Args:
            processed_data: Pre-processed benchmark data
            config: Optional configuration dictionary
        """
        self._processed_data = processed_data
        self._data_processor = DataProcessingService()
        
        # Default configuration
        self._aggregation_config = {
            'cache_ttl': timedelta(hours=1),
            'outlier_threshold': 1.5,
            'min_sample_size': 3,
            'confidence_level': 0.95,
            'performance_logging': True
        }
        if config:
            self._aggregation_config.update(config)
            
        # Initialize cache
        self._cache: Dict[str, Dict] = {}
        self._last_cache_cleanup = datetime.now()
        
        # Setup logging
        self._logger = logging.getLogger(__name__)
        
        # Performance metrics
        self._performance_metrics = {
            'cache_hits': 0,
            'cache_misses': 0,
            'processing_times': []
        }

    def aggregate_by_revenue_range(
        self,
        metric_name: str,
        revenue_ranges: Optional[List[str]] = None,
        use_cache: bool = True
    ) -> Dict[str, Dict]:
        """
        Aggregates benchmark data by revenue range with comprehensive statistics.
        
        Args:
            metric_name: Target metric name
            revenue_ranges: Optional list of revenue ranges to filter
            use_cache: Whether to use cached results
            
        Returns:
            Dict containing aggregated statistics by revenue range
            
        Raises:
            ValueError: If aggregation fails or invalid parameters
        """
        start_time = datetime.now()
        try:
            # Input validation
            if not metric_name:
                raise ValueError("Metric name must be specified")
                
            # Check cache if enabled
            cache_key = f"revenue_range_{metric_name}_{str(revenue_ranges)}"
            if use_cache and cache_key in self._cache:
                cache_entry = self._cache[cache_key]
                if datetime.now() - cache_entry['timestamp'] < self._aggregation_config['cache_ttl']:
                    self._performance_metrics['cache_hits'] += 1
                    return cache_entry['data']
            
            self._performance_metrics['cache_misses'] += 1
            
            # Filter data by revenue ranges
            filtered_data = self._processed_data[
                self._processed_data['metric_id'] == metric_name
            ]
            if revenue_ranges:
                filtered_data = filtered_data[
                    filtered_data['revenue_range'].isin(revenue_ranges)
                ]
            
            if filtered_data.empty:
                raise ValueError(f"No data found for metric: {metric_name}")
            
            # Calculate statistics for each revenue range
            results = {}
            for revenue_range in filtered_data['revenue_range'].unique():
                range_data = filtered_data[
                    filtered_data['revenue_range'] == revenue_range
                ]
                
                if len(range_data) < self._aggregation_config['min_sample_size']:
                    self._logger.warning(
                        f"Insufficient data points for {revenue_range}"
                    )
                    continue
                
                # Convert to BenchmarkModel instances for statistics calculation
                benchmark_models = [
                    BenchmarkModel.from_dict(row) 
                    for _, row in range_data.iterrows()
                ]
                
                try:
                    stats = calculate_benchmark_statistics(
                        benchmark_models,
                        revenue_range,
                        metric_name
                    )
                    
                    # Add trend analysis
                    trend_data = self._calculate_trend(range_data)
                    stats['trend_analysis'] = trend_data
                    
                    results[revenue_range] = stats
                    
                except MetricValidationError as e:
                    self._logger.error(
                        f"Error calculating statistics for {revenue_range}: {str(e)}"
                    )
                    continue
            
            # Cache results
            if use_cache:
                self._cache[cache_key] = {
                    'data': results,
                    'timestamp': datetime.now()
                }
                self._cleanup_cache()
            
            # Record performance metrics
            processing_time = (datetime.now() - start_time).total_seconds()
            self._performance_metrics['processing_times'].append(processing_time)
            
            return {
                'statistics': results,
                'metadata': {
                    'sample_sizes': {
                        rr: len(filtered_data[filtered_data['revenue_range'] == rr])
                        for rr in results.keys()
                    },
                    'processing_time': processing_time,
                    'cache_status': 'miss'
                }
            }
            
        except Exception as e:
            self._logger.error(f"Error in revenue range aggregation: {str(e)}")
            raise ValueError(f"Failed to aggregate by revenue range: {str(e)}")

    def aggregate_by_time_period(
        self,
        metric_name: str,
        period_type: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Dict]:
        """
        Aggregates benchmark data by time period with trend analysis.
        
        Args:
            metric_name: Target metric name
            period_type: Aggregation period (daily, weekly, monthly, quarterly)
            start_date: Optional start date for filtering
            end_date: Optional end date for filtering
            
        Returns:
            Dict containing time series analysis and trends
            
        Raises:
            ValueError: If aggregation fails or invalid parameters
        """
        try:
            # Validate period type
            valid_periods = ['daily', 'weekly', 'monthly', 'quarterly']
            if period_type not in valid_periods:
                raise ValueError(f"Invalid period type. Must be one of {valid_periods}")
            
            # Filter data
            filtered_data = self._processed_data[
                self._processed_data['metric_id'] == metric_name
            ].copy()
            
            if start_date:
                filtered_data = filtered_data[
                    filtered_data['period_end'] >= start_date
                ]
            if end_date:
                filtered_data = filtered_data[
                    filtered_data['period_start'] <= end_date
                ]
            
            # Group by time period
            filtered_data['period'] = self._get_period_group(
                filtered_data['period_end'],
                period_type
            )
            
            grouped_data = filtered_data.groupby(['period', 'revenue_range'])
            
            # Calculate statistics for each period
            results = {}
            for (period, revenue_range), group in grouped_data:
                if len(group) < self._aggregation_config['min_sample_size']:
                    continue
                    
                benchmark_models = [
                    BenchmarkModel.from_dict(row) 
                    for _, row in group.iterrows()
                ]
                
                try:
                    stats = calculate_benchmark_statistics(
                        benchmark_models,
                        revenue_range,
                        metric_name
                    )
                    
                    if period not in results:
                        results[period] = {}
                    results[period][revenue_range] = stats
                    
                except MetricValidationError as e:
                    self._logger.warning(
                        f"Error calculating statistics for {period}, {revenue_range}: {str(e)}"
                    )
                    continue
            
            # Add trend analysis
            trend_analysis = self._analyze_time_series_trends(results)
            
            return {
                'time_series': results,
                'trend_analysis': trend_analysis,
                'metadata': {
                    'period_type': period_type,
                    'start_date': start_date,
                    'end_date': end_date,
                    'total_periods': len(results)
                }
            }
            
        except Exception as e:
            self._logger.error(f"Error in time period aggregation: {str(e)}")
            raise ValueError(f"Failed to aggregate by time period: {str(e)}")

    def calculate_percentiles(
        self,
        metric_name: str,
        percentiles: List[float],
        exclude_outliers: bool = True
    ) -> Dict[str, Dict]:
        """
        Calculates detailed percentile distributions with outlier handling.
        
        Args:
            metric_name: Target metric name
            percentiles: List of percentiles to calculate
            exclude_outliers: Whether to exclude outliers from calculations
            
        Returns:
            Dict containing percentile analysis by revenue range
            
        Raises:
            ValueError: If calculation fails or invalid parameters
        """
        try:
            # Validate percentiles
            if not all(0 <= p <= 100 for p in percentiles):
                raise ValueError("Percentiles must be between 0 and 100")
            
            filtered_data = self._processed_data[
                self._processed_data['metric_id'] == metric_name
            ].copy()
            
            if exclude_outliers:
                filtered_data = self._remove_outliers(filtered_data, 'value')
            
            results = {}
            for revenue_range in filtered_data['revenue_range'].unique():
                range_data = filtered_data[
                    filtered_data['revenue_range'] == revenue_range
                ]
                
                if len(range_data) < self._aggregation_config['min_sample_size']:
                    continue
                
                # Calculate percentiles
                percentile_values = np.percentile(range_data['value'], percentiles)
                
                # Calculate confidence intervals
                confidence_intervals = self._calculate_percentile_confidence_intervals(
                    range_data['value'],
                    percentiles
                )
                
                results[revenue_range] = {
                    'percentiles': dict(zip(percentiles, percentile_values)),
                    'confidence_intervals': confidence_intervals,
                    'sample_size': len(range_data),
                    'distribution_stats': {
                        'skewness': float(range_data['value'].skew()),
                        'kurtosis': float(range_data['value'].kurtosis())
                    }
                }
            
            return results
            
        except Exception as e:
            self._logger.error(f"Error calculating percentiles: {str(e)}")
            raise ValueError(f"Failed to calculate percentiles: {str(e)}")

    def generate_comparison_report(
        self,
        metric_name: str,
        revenue_range: str,
        company_value: Decimal
    ) -> Dict[str, Union[Dict, str]]:
        """
        Generates comprehensive benchmark comparison report with insights.
        
        Args:
            metric_name: Target metric name
            revenue_range: Company's revenue range
            company_value: Company's metric value
            
        Returns:
            Dict containing detailed comparison analysis and recommendations
            
        Raises:
            ValueError: If report generation fails or invalid parameters
        """
        try:
            filtered_data = self._processed_data[
                (self._processed_data['metric_id'] == metric_name) &
                (self._processed_data['revenue_range'] == revenue_range)
            ]
            
            if filtered_data.empty:
                raise ValueError(
                    f"No benchmark data for {metric_name} in {revenue_range}"
                )
            
            # Calculate statistics
            benchmark_models = [
                BenchmarkModel.from_dict(row) 
                for _, row in filtered_data.iterrows()
            ]
            
            stats = calculate_benchmark_statistics(
                benchmark_models,
                revenue_range,
                metric_name
            )
            
            # Calculate company's percentile
            percentile = np.percentile(
                filtered_data['value'],
                np.searchsorted(
                    np.sort(filtered_data['value']),
                    float(company_value)
                ) / len(filtered_data['value']) * 100
            )
            
            # Generate insights
            insights = self._generate_insights(
                float(company_value),
                stats,
                percentile
            )
            
            return {
                'comparison': {
                    'company_value': float(company_value),
                    'percentile': float(percentile),
                    'benchmark_stats': stats
                },
                'insights': insights,
                'recommendations': self._generate_recommendations(
                    metric_name,
                    float(company_value),
                    stats
                ),
                'metadata': {
                    'sample_size': len(filtered_data),
                    'confidence_level': self._aggregation_config['confidence_level']
                }
            }
            
        except Exception as e:
            self._logger.error(f"Error generating comparison report: {str(e)}")
            raise ValueError(f"Failed to generate comparison report: {str(e)}")

    def _get_period_group(
        self,
        dates: pd.Series,
        period_type: str
    ) -> pd.Series:
        """Helper method to group dates by period type."""
        if period_type == 'daily':
            return dates.dt.date
        elif period_type == 'weekly':
            return dates.dt.to_period('W').astype(str)
        elif period_type == 'monthly':
            return dates.dt.to_period('M').astype(str)
        else:  # quarterly
            return dates.dt.to_period('Q').astype(str)

    def _remove_outliers(
        self,
        data: pd.DataFrame,
        column: str
    ) -> pd.DataFrame:
        """Remove outliers using IQR method."""
        Q1 = data[column].quantile(0.25)
        Q3 = data[column].quantile(0.75)
        IQR = Q3 - Q1
        
        return data[
            (data[column] >= Q1 - self._aggregation_config['outlier_threshold'] * IQR) &
            (data[column] <= Q3 + self._aggregation_config['outlier_threshold'] * IQR)
        ]

    def _calculate_trend(self, data: pd.DataFrame) -> Dict[str, float]:
        """Calculate trend indicators for time series data."""
        if len(data) < 2:
            return {}
            
        sorted_data = data.sort_values('period_end')
        values = sorted_data['value'].values
        
        return {
            'slope': float(np.polyfit(range(len(values)), values, 1)[0]),
            'correlation': float(np.corrcoef(range(len(values)), values)[0, 1]),
            'volatility': float(np.std(np.diff(values)) / np.mean(values))
        }

    def _calculate_percentile_confidence_intervals(
        self,
        data: pd.Series,
        percentiles: List[float],
        n_bootstrap: int = 1000
    ) -> Dict[float, Tuple[float, float]]:
        """Calculate confidence intervals for percentiles using bootstrapping."""
        bootstrap_percentiles = np.zeros((n_bootstrap, len(percentiles)))
        
        for i in range(n_bootstrap):
            sample = np.random.choice(data, size=len(data), replace=True)
            bootstrap_percentiles[i] = np.percentile(sample, percentiles)
        
        ci_lower = np.percentile(bootstrap_percentiles, 2.5, axis=0)
        ci_upper = np.percentile(bootstrap_percentiles, 97.5, axis=0)
        
        return {
            p: (float(l), float(u))
            for p, l, u in zip(percentiles, ci_lower, ci_upper)
        }

    def _analyze_time_series_trends(
        self,
        time_series_data: Dict[str, Dict]
    ) -> Dict[str, Dict]:
        """Analyze trends in time series data."""
        trends = {}
        for revenue_range in set(
            rr for period in time_series_data.values() 
            for rr in period.keys()
        ):
            series = [
                period[revenue_range]['mean']
                for period in time_series_data.values()
                if revenue_range in period
            ]
            
            if len(series) < 2:
                continue
                
            trends[revenue_range] = {
                'trend_direction': 'up' if np.polyfit(
                    range(len(series)),
                    series,
                    1
                )[0] > 0 else 'down',
                'volatility': float(np.std(series) / np.mean(series)),
                'seasonality': self._detect_seasonality(series)
            }
        
        return trends

    def _detect_seasonality(self, series: List[float]) -> Dict[str, float]:
        """Detect seasonality in time series data."""
        if len(series) < 4:
            return {'seasonal_strength': 0.0}
            
        # Simple seasonality detection using autocorrelation
        acf = np.correlate(series, series, mode='full')[len(series)-1:]
        seasonal_strength = float(max(acf[1:min(len(acf), 13)]) / acf[0])
        
        return {
            'seasonal_strength': seasonal_strength,
            'likely_period': int(np.argmax(acf[1:min(len(acf), 13)]) + 1)
        }

    def _generate_insights(
        self,
        company_value: float,
        stats: Dict,
        percentile: float
    ) -> List[str]:
        """Generate insights based on statistical comparison."""
        insights = []
        
        # Performance relative to median
        relative_to_median = (company_value - stats['median']) / stats['median'] * 100
        insights.append(
            f"Performance is {abs(relative_to_median):.1f}% "
            f"{'above' if relative_to_median > 0 else 'below'} median"
        )
        
        # Percentile standing
        insights.append(
            f"Performs better than {percentile:.1f}% of companies "
            f"in the same revenue range"
        )
        
        # Volatility comparison
        if 'iqr' in stats:
            market_volatility = stats['iqr'] / stats['median']
            insights.append(
                f"Market shows {'high' if market_volatility > 0.5 else 'moderate'} "
                f"volatility at {market_volatility:.2f} coefficient"
            )
        
        return insights

    def _generate_recommendations(
        self,
        metric_name: str,
        company_value: float,
        stats: Dict
    ) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        recommendations = []
        
        # Performance gap analysis
        gap_to_top_quartile = stats['percentiles']['p75'] - company_value
        if gap_to_top_quartile > 0:
            recommendations.append(
                f"Opportunity to improve {metric_name} by {gap_to_top_quartile:.1f} "
                f"to reach top quartile performance"
            )
        
        # Risk assessment
        if company_value < stats['percentiles']['p25']:
            recommendations.append(
                f"Consider strategies to improve {metric_name} as current "
                f"performance is in bottom quartile"
            )
        
        return recommendations

    def _cleanup_cache(self) -> None:
        """Perform cache cleanup based on TTL."""
        current_time = datetime.now()
        expired_keys = [
            key for key, value in self._cache.items()
            if current_time - value['timestamp'] > self._aggregation_config['cache_ttl']
        ]
        for key in expired_keys:
            del self._cache[key]