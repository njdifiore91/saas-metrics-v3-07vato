from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Dict, Optional
from pydantic import BaseModel, validator
from google.protobuf.timestamp_pb2 import Timestamp

from benchmark_pb2 import BenchmarkData, RevenueRange

# Constants for validation and configuration
REVENUE_RANGES = [
    RevenueRange.REVENUE_RANGE_1M_5M,
    RevenueRange.REVENUE_RANGE_5M_10M, 
    RevenueRange.REVENUE_RANGE_10M_50M,
    RevenueRange.REVENUE_RANGE_50M_PLUS
]

DECIMAL_PRECISION = Decimal('0.0001')
DEFAULT_CURRENCY = 'USD'
MAX_VALUE = Decimal('1000000000')  # 1 billion
MIN_VALUE = Decimal('0')
MAX_DATE_RANGE_YEARS = 5

@dataclass
class BenchmarkModel(BaseModel):
    """
    Pydantic model for benchmark data with comprehensive validation and serialization.
    Implements the benchmark.proto message structure with enhanced validation rules.
    """
    id: str
    metric_id: str
    source_id: str
    revenue_range: RevenueRange
    value: Decimal
    period_start: datetime
    period_end: datetime
    currency: str = DEFAULT_CURRENCY
    metadata: Dict[str, str] = field(default_factory=dict)

    class Config:
        """Pydantic configuration"""
        arbitrary_types_allowed = True
        json_encoders = {
            Decimal: str,
            datetime: lambda v: v.isoformat(),
            RevenueRange: lambda v: v.name
        }

    @validator('revenue_range')
    def validate_revenue_range(cls, value: RevenueRange) -> RevenueRange:
        """Validates revenue range against defined enum values"""
        if value not in REVENUE_RANGES:
            raise ValueError(
                f"Invalid revenue range: {value}. Must be one of {[r.name for r in REVENUE_RANGES]}"
            )
        return value

    @validator('value')
    def validate_value(cls, value: Decimal) -> Decimal:
        """Validates metric value for bounds and precision"""
        if not isinstance(value, Decimal):
            value = Decimal(str(value))
        
        if value < MIN_VALUE:
            raise ValueError(f"Value cannot be negative: {value}")
        
        if value > MAX_VALUE:
            raise ValueError(f"Value exceeds maximum allowed: {value}")
        
        # Normalize to required precision
        return value.quantize(DECIMAL_PRECISION)

    @validator('period_end')
    def validate_dates(cls, period_end: datetime, values: Dict) -> datetime:
        """Validates period start and end dates for consistency"""
        if 'period_start' not in values:
            raise ValueError("period_start is required")
            
        period_start = values['period_start']
        
        if period_end <= period_start:
            raise ValueError("period_end must be after period_start")
            
        date_range = period_end - period_start
        if date_range.days > MAX_DATE_RANGE_YEARS * 365:
            raise ValueError(f"Date range cannot exceed {MAX_DATE_RANGE_YEARS} years")
            
        return period_end

    @validator('source_id')
    def validate_source_id(cls, value: str) -> str:
        """Validates source identifier format"""
        if not value or not value.strip():
            raise ValueError("source_id cannot be empty")
        if len(value) > 50:
            raise ValueError("source_id exceeds maximum length of 50 characters")
        return value.strip()

    def to_proto(self) -> BenchmarkData:
        """
        Converts the model instance to a protobuf message.
        Returns:
            BenchmarkData: Protobuf message containing benchmark data
        """
        period_start = Timestamp()
        period_start.FromDatetime(self.period_start)
        
        period_end = Timestamp()
        period_end.FromDatetime(self.period_end)
        
        return BenchmarkData(
            id=self.id,
            metric_id=self.metric_id,
            source_id=self.source_id,
            revenue_range=self.revenue_range,
            value=float(self.value),
            period_start=period_start,
            period_end=period_end,
            metadata=self.metadata
        )

    @classmethod
    def from_proto(cls, proto_msg: BenchmarkData) -> 'BenchmarkModel':
        """
        Creates a model instance from a protobuf message.
        Args:
            proto_msg: BenchmarkData protobuf message
        Returns:
            BenchmarkModel: New validated instance
        """
        return cls(
            id=proto_msg.id,
            metric_id=proto_msg.metric_id,
            source_id=proto_msg.source_id,
            revenue_range=proto_msg.revenue_range,
            value=Decimal(str(proto_msg.value)),
            period_start=proto_msg.period_start.ToDatetime(),
            period_end=proto_msg.period_end.ToDatetime(),
            metadata=dict(proto_msg.metadata)
        )

    def __post_init__(self):
        """Performs additional validation after initialization"""
        if not self.metadata:
            self.metadata = {}
        
        # Ensure all string fields are properly stripped
        self.id = self.id.strip()
        self.metric_id = self.metric_id.strip()
        self.source_id = self.source_id.strip()
        self.currency = self.currency.strip().upper()