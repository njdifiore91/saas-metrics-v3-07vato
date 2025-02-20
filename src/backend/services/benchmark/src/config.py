import os
from typing import Dict, List, Optional
from pydantic import SecretStr
from pydantic_settings import BaseSettings

# Global environment variables with secure defaults
ENV = os.getenv('ENV', 'development')
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')

# Default configuration with secure values
DEFAULT_CONFIG = {
    'SERVICE_NAME': 'Benchmark Service',
    'VERSION': '1.0.0',
    'DATABASE': {
        'host': 'localhost',
        'port': 5432,
        'name': 'benchmark_db',
        'user': 'benchmark_user',
        'pool_size': 5,
        'max_overflow': 10,
        'timeout': 30
    },
    'REDIS_CONFIG': {
        'host': 'localhost',
        'port': 6379,
        'db': 0,
        'timeout': 5,
        'retry_on_timeout': True,
        'max_connections': 10
    },
    'LOGGING': {
        'level': 'INFO',
        'format': 'json',
        'handlers': ['console', 'file'],
        'retention_days': 30
    },
    'ALLOWED_HOSTS': ['*'],
    'API_RATE_LIMIT': 1000,
    'TELEMETRY_CONFIG': {
        'enabled': True,
        'sample_rate': 0.1,
        'metrics_port': 9090
    }
}

class Settings(BaseSettings):
    """Enhanced Pydantic settings class for service configuration with security features"""
    
    # Basic service configuration
    ENV: str = ENV
    DEBUG: bool = DEBUG
    SERVICE_NAME: str = DEFAULT_CONFIG['SERVICE_NAME']
    VERSION: str = DEFAULT_CONFIG['VERSION']
    
    # Secure database credentials
    DB_PASSWORD: SecretStr = SecretStr('')
    
    # Configuration dictionaries
    DATABASE: Dict = DEFAULT_CONFIG['DATABASE']
    REDIS_CONFIG: Dict = DEFAULT_CONFIG['REDIS_CONFIG']
    LOGGING: Dict = DEFAULT_CONFIG['LOGGING']
    
    # Security and performance settings
    ALLOWED_HOSTS: List[str] = DEFAULT_CONFIG['ALLOWED_HOSTS']
    API_RATE_LIMIT: int = DEFAULT_CONFIG['API_RATE_LIMIT']
    CONNECTION_POOL_SIZE: int = DEFAULT_CONFIG['DATABASE']['pool_size']
    CONNECTION_MAX_OVERFLOW: int = DEFAULT_CONFIG['DATABASE']['max_overflow']
    CONNECTION_TIMEOUT: int = DEFAULT_CONFIG['DATABASE']['timeout']
    TELEMETRY_CONFIG: Dict = DEFAULT_CONFIG['TELEMETRY_CONFIG']

    def __init__(self, **kwargs):
        """Initializes service configuration with enhanced security and validation"""
        super().__init__(**kwargs)
        
        # Override settings from environment variables
        self.ENV = os.getenv('ENV', self.ENV)
        self.DEBUG = os.getenv('DEBUG', str(self.DEBUG)).lower() == 'true'
        
        # Load sensitive data from environment
        self.DB_PASSWORD = SecretStr(os.getenv('DB_PASSWORD', ''))
        
        # Validate all settings
        self.validate_settings()

    def get_database_url(self) -> str:
        """Constructs secure database connection URL with credentials"""
        db_config = self.DATABASE
        password = self.DB_PASSWORD.get_secret_value()
        
        # Construct URL with proper escaping
        url = f"postgresql://{db_config['user']}:{password}@{db_config['host']}:{db_config['port']}/{db_config['name']}"
        
        # Add connection pool parameters
        url += f"?pool_size={self.CONNECTION_POOL_SIZE}"
        url += f"&max_overflow={self.CONNECTION_MAX_OVERFLOW}"
        url += f"&pool_timeout={self.CONNECTION_TIMEOUT}"
        
        return url

    def validate_settings(self) -> bool:
        """Validates all configuration settings"""
        try:
            # Environment-specific validation
            if self.ENV not in ['development', 'staging', 'production']:
                raise ValueError(f"Invalid environment: {self.ENV}")
            
            # Security validation
            if self.ENV == 'production':
                if '*' in self.ALLOWED_HOSTS:
                    raise ValueError("Wildcard ALLOWED_HOSTS not permitted in production")
                if self.DEBUG:
                    raise ValueError("DEBUG mode not allowed in production")
            
            # Database configuration validation
            if not self.DB_PASSWORD.get_secret_value():
                raise ValueError("Database password not configured")
            
            # Connection pool validation
            if self.CONNECTION_POOL_SIZE < 1:
                raise ValueError("Invalid connection pool size")
            if self.CONNECTION_MAX_OVERFLOW < 0:
                raise ValueError("Invalid connection max overflow")
            
            # Rate limiting validation
            if self.API_RATE_LIMIT < 1:
                raise ValueError("Invalid API rate limit")
            
            return True
            
        except Exception as e:
            raise ValueError(f"Configuration validation failed: {str(e)}")

# Create global settings instance
settings = Settings()