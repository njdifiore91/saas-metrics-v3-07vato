"""
Benchmark Service Setup Configuration
Package setup and configuration for the benchmark data aggregation and processing service.
"""
import os
from setuptools import setup, find_packages  # setuptools==68.0.0

def read_requirements(filename="requirements.txt"):
    """Read and parse requirements from requirements.txt file."""
    requirements = []
    if os.path.exists(filename):
        with open(filename, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    requirements.append(line)
    return requirements

setup(
    name="benchmark-service",
    version="1.0.0",
    description="Benchmark data aggregation and processing service for startup metrics platform",
    author="Startup Metrics Platform Team",
    author_email="team@startupmetrics.com",
    url="https://github.com/startup-metrics/benchmark-service",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.11",
    install_requires=[
        "fastapi==0.100.0",
        "uvicorn==0.22.0",
        "grpcio==1.56.0",
        "grpcio-tools==1.56.0", 
        "numpy==1.24.0",
        "pandas==2.0.0",
        "prometheus-client==0.17.0",
        "pydantic==2.0.0",
        "python-dotenv==1.0.0",
        "sqlalchemy==2.0.0",
        "psycopg2-binary==2.9.6"
    ],
    extras_require={
        "dev": [
            "pytest==7.4.0",
            "pytest-asyncio==0.21.0", 
            "pytest-cov==4.1.0",
            "black==23.7.0",
            "isort==5.12.0",
            "mypy==1.4.0",
            "flake8==6.0.0"
        ]
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "Operating System :: OS Independent", 
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules"
    ],
    include_package_data=True,
    zip_safe=False,
    license="Proprietary",
    platforms="any"
)