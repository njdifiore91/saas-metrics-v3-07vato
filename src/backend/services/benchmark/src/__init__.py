"""
Benchmark Service Package Initialization
Version: 1.0.0

Initializes core components and configures enhanced structured logging for the benchmark service.
"""

import structlog  # v23.1.0
from typing import Dict, List

from app import app
from config import settings

# Package version
__version__ = '1.0.0'

# Initialize structured logger
logger = structlog.get_logger()

def configure_logging() -> None:
    """
    Configures structured logging with environment-specific processors and formatters.
    Implements comprehensive logging strategy with retention policies and error tracking.
    """
    # Configure processors based on environment
    processors: List[structlog.typing.Processor] = [
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    # Add environment-specific processors
    if settings.ENV == 'production':
        processors.extend([
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer()
        ])
    else:
        processors.extend([
            structlog.dev.ConsoleRenderer(
                colors=True,
                exception_formatter=structlog.dev.plain_traceback
            )
        ])

    # Configure shared processors
    shared_processors: List[structlog.typing.Processor] = [
        structlog.threadlocal.merge_threadlocal,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.ExceptionPrettyPrinter(),
    ]

    # Configure structlog
    structlog.configure(
        processors=processors,
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure standard logging integration
    structlog.stdlib.configure_logging(
        processors=shared_processors + [
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter
        ]
    )

    # Set log level from settings
    logger.info(
        "Logging configured",
        environment=settings.ENV,
        log_level=settings.LOGGING['level']
    )

# Configure logging on module import
configure_logging()

# Export core components
__all__ = [
    'app',          # FastAPI application instance
    'settings',     # Configuration settings
    'logger',       # Configured structured logger
    '__version__'   # Package version
]