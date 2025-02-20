"""
Unit tests for benchmark metric calculations and statistical analysis.
Tests standardized formulas and data processing with comprehensive validation.

Version: 1.0.0
"""

import pytest
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Dict, Any

from src.utils.calculations import (
    calculate_net_dollar_retention,
    calculate_magic_number,
    calculate_cac_payback,
    calculate_benchmark_statistics,
    MetricValidationError
)
from src.models.benchmark_model import BenchmarkModel, RevenueRange

@pytest.mark.unit
class TestCalculations:
    """Test suite for benchmark calculations with comprehensive validation"""

    def setup_method(self, method: Any) -> None:
        """Setup test data and constants before each test"""
        # Initialize test constants with proper decimal precision
        self.test_constants = {
            'starting_arr': Decimal('1000000'),
            'expansions': Decimal('200000'),
            'contractions': Decimal('50000'),
            'churn': Decimal('100000'),
            'net_new_arr': Decimal('500000'),
            'sales_spend': Decimal('250000'),
            'cac': Decimal('50000'),
            'arpa': Decimal('10000'),
            'gross_margin': Decimal('0.7')
        }

        # Create sample benchmark data
        self.sample_benchmark_data: List[BenchmarkModel] = [
            BenchmarkModel(
                id=f"test_{i}",
                metric_id="test_metric",
                source_id="test_source",
                revenue_range=RevenueRange.REVENUE_RANGE_1M_5M,
                value=Decimal(str(100 + i * 10)),
                period_start="2023-01-01T00:00:00Z",
                period_end="2023-12-31T23:59:59Z"
            ) for i in range(10)
        ]

    @pytest.mark.unit
    def test_calculate_net_dollar_retention(self) -> None:
        """Test NDR calculation with comprehensive validation"""
        # Test valid NDR calculation (baseline case)
        ndr = calculate_net_dollar_retention(
            self.test_constants['starting_arr'],
            self.test_constants['expansions'],
            self.test_constants['contractions'],
            self.test_constants['churn']
        )
        assert isinstance(ndr, Decimal)
        assert Decimal('105') == ndr  # (1M + 200K - 50K - 100K) / 1M * 100

        # Test NDR with zero starting ARR
        with pytest.raises(MetricValidationError) as exc:
            calculate_net_dollar_retention(
                Decimal('0'),
                self.test_constants['expansions'],
                self.test_constants['contractions'],
                self.test_constants['churn']
            )
        assert "starting_arr must be greater than zero" in str(exc.value)

        # Test NDR with negative values
        with pytest.raises(MetricValidationError) as exc:
            calculate_net_dollar_retention(
                self.test_constants['starting_arr'],
                Decimal('-100000'),
                self.test_constants['contractions'],
                self.test_constants['churn']
            )
        assert "cannot be negative" in str(exc.value)

        # Test NDR exceeding maximum allowed value
        with pytest.raises(MetricValidationError) as exc:
            calculate_net_dollar_retention(
                Decimal('100000'),
                Decimal('300000'),
                Decimal('0'),
                Decimal('0')
            )
        assert "must be between 0% and 200%" in str(exc.value)

        # Test NDR with decimal precision
        ndr = calculate_net_dollar_retention(
            Decimal('100000.123'),
            Decimal('50000.456'),
            Decimal('10000.789'),
            Decimal('5000.012')
        )
        assert ndr.as_tuple().exponent == -4  # Verify 4 decimal places

    @pytest.mark.unit
    def test_calculate_magic_number(self) -> None:
        """Test Magic Number calculation with boundary validation"""
        # Test valid Magic Number calculation
        magic_number = calculate_magic_number(
            self.test_constants['net_new_arr'],
            self.test_constants['sales_spend']
        )
        assert isinstance(magic_number, Decimal)
        assert Decimal('2') == magic_number  # 500K / 250K

        # Test with zero sales spend
        with pytest.raises(MetricValidationError) as exc:
            calculate_magic_number(
                self.test_constants['net_new_arr'],
                Decimal('0')
            )
        assert "sales_marketing_spend must be greater than zero" in str(exc.value)

        # Test exceeding maximum value
        with pytest.raises(MetricValidationError) as exc:
            calculate_magic_number(
                Decimal('5000000'),
                Decimal('100000')
            )
        assert "must be between 0 and 10" in str(exc.value)

        # Test with negative values
        with pytest.raises(MetricValidationError) as exc:
            calculate_magic_number(
                Decimal('-100000'),
                self.test_constants['sales_spend']
            )
        assert "cannot be negative" in str(exc.value)

        # Test decimal precision
        magic_number = calculate_magic_number(
            Decimal('100000.123'),
            Decimal('50000.456')
        )
        assert magic_number.as_tuple().exponent == -4

    @pytest.mark.unit
    def test_calculate_cac_payback(self) -> None:
        """Test CAC Payback calculation with validation rules"""
        # Test valid CAC Payback calculation
        payback = calculate_cac_payback(
            self.test_constants['cac'],
            self.test_constants['arpa'],
            self.test_constants['gross_margin']
        )
        assert isinstance(payback, Decimal)
        assert Decimal('8.5714') == payback  # (50K / (10K * 0.7)) * 12

        # Test with invalid gross margin
        with pytest.raises(MetricValidationError) as exc:
            calculate_cac_payback(
                self.test_constants['cac'],
                self.test_constants['arpa'],
                Decimal('1.5')
            )
        assert "gross_margin must be between 0 and 1" in str(exc.value)

        # Test with zero ARPA
        with pytest.raises(MetricValidationError) as exc:
            calculate_cac_payback(
                self.test_constants['cac'],
                Decimal('0'),
                self.test_constants['gross_margin']
            )
        assert "Product of ARPA and gross_margin must be greater than zero" in str(exc.value)

        # Test exceeding maximum months
        with pytest.raises(MetricValidationError) as exc:
            calculate_cac_payback(
                Decimal('1000000'),
                Decimal('1000'),
                Decimal('0.7')
            )
        assert "must be between 0 and 60 months" in str(exc.value)

        # Test decimal precision
        payback = calculate_cac_payback(
            Decimal('50000.123'),
            Decimal('10000.456'),
            Decimal('0.7')
        )
        assert payback.as_tuple().exponent == -4

    @pytest.mark.unit
    def test_calculate_benchmark_statistics(self) -> None:
        """Test benchmark statistics calculation with statistical validation"""
        # Test valid statistics calculation
        stats = calculate_benchmark_statistics(
            self.sample_benchmark_data,
            RevenueRange.REVENUE_RANGE_1M_5M.name,
            "test_metric"
        )
        
        assert isinstance(stats, dict)
        assert all(key in stats for key in [
            'mean', 'median', 'std_dev', 'percentiles',
            'outliers', 'sample_size', 'confidence_interval'
        ])

        # Test with empty data
        with pytest.raises(MetricValidationError) as exc:
            calculate_benchmark_statistics([], "REVENUE_RANGE_1M_5M", "test_metric")
        assert "Empty benchmark data provided" in str(exc.value)

        # Test with insufficient data points
        with pytest.raises(MetricValidationError) as exc:
            calculate_benchmark_statistics(
                self.sample_benchmark_data[:2],
                RevenueRange.REVENUE_RANGE_1M_5M.name,
                "test_metric"
            )
        assert "Insufficient data points" in str(exc.value)

        # Verify statistical calculations
        assert stats['mean'] > 0
        assert stats['median'] > 0
        assert stats['std_dev'] >= 0
        assert stats['percentiles']['p25'] < stats['percentiles']['p75']
        assert stats['sample_size'] == len(self.sample_benchmark_data)
        assert stats['confidence_interval']['lower'] < stats['confidence_interval']['upper']