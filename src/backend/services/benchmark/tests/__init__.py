"""
Benchmark Service Test Suite Configuration
Configures test environment, fixtures, and pytest markers for comprehensive testing
of benchmark data processing and aggregation functionality.

External Dependencies:
- pytest==7.4.0: Core testing framework configuration and test runner setup
- pytest-asyncio==0.21.0: Asynchronous testing support for benchmark service async operations
"""

# Enable async test support through pytest-asyncio plugin
pytest_plugins = ['pytest_asyncio']

def pytest_configure(config):
    """
    Configures pytest settings, custom markers, test paths, and async support for the benchmark service test suite.
    
    Args:
        config: The pytest configuration object
        
    Returns:
        None: Configuration is applied directly to pytest environment
    """
    # Register custom test markers
    config.addinivalue_line(
        "markers",
        "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", 
        "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers",
        "async: mark test as an asynchronous test requiring async support"
    )

    # Configure test discovery settings
    config.addinivalue_line(
        "testpaths",
        "src/backend/services/benchmark/tests"
    )
    config.addinivalue_line(
        "python_files",
        "test_*.py *_test.py"
    )

    # Configure test coverage thresholds
    config.addinivalue_line(
        "coverage:report",
        "fail_under=90"
    )

    # Configure parallel test execution
    config.addinivalue_line(
        "addopts",
        "-n auto --dist loadfile"
    )

    # Configure test result reporting
    config.addinivalue_line(
        "addopts",
        "--verbose --tb=short"
    )

    # Configure async test settings
    config.addinivalue_line(
        "asyncio_mode",
        "auto"
    )

    # Configure test cleanup procedures
    config.addinivalue_line(
        "addopts",
        "--strict-markers --strict-config"
    )