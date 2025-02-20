# Contributing to Startup Metrics Benchmarking Platform

## Table of Contents
- [Introduction](#introduction)
  - [Project Overview](#project-overview)
  - [Contribution Process](#contribution-process)
- [Development Environment Setup](#development-environment-setup)
  - [Required Software](#required-software)
  - [IDE Configuration](#ide-configuration)
  - [Local Development](#local-development)
- [Code Standards](#code-standards)
  - [TypeScript Guidelines](#typescript-guidelines)
  - [Python Guidelines](#python-guidelines)
  - [Testing Requirements](#testing-requirements)
  - [Code Review Process](#code-review-process)
- [CI/CD Pipeline](#cicd-pipeline)
  - [GitHub Actions](#github-actions)
  - [Quality Gates](#quality-gates)
- [Security](#security)
  - [Security Best Practices](#security-best-practices)
  - [Vulnerability Reporting](#vulnerability-reporting)

## Introduction

### Project Overview
The Startup Metrics Benchmarking Platform is a cloud-based web application that provides comprehensive benchmark data and personalized comparisons across key startup performance metrics. The platform is built using a microservices architecture with React frontend, Node.js backend services, and Python data processing components.

### Contribution Process
1. **Issue Creation**
   - Check existing issues to avoid duplicates
   - Use provided issue templates
   - Tag issues appropriately (bug, feature, enhancement)

2. **Pull Request Workflow**
   - Fork the repository
   - Create a feature branch (`feature/description` or `fix/description`)
   - Commit using conventional commits format
   - Submit PR using provided template
   - Link related issues

3. **Review Process**
   - Two approvals required
   - All checks must pass
   - PR description must be complete
   - Changes must be tested

## Development Environment Setup

### Required Software
| Software | Version | Notes |
|----------|---------|-------|
| Node.js | 20 LTS | Required for API and web services |
| Python | 3.11+ | Required for benchmark service |
| Docker | 24.0+ | Container runtime |
| Git | 2.40+ | Version control |
| Terraform | 1.5+ | Infrastructure as code |

### IDE Configuration
VSCode is our recommended IDE. Required extensions:
- ESLint
- Prettier
- Python
- Docker
- GitLens
- Terraform

Settings.json configuration:
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "python.linting.enabled": true,
  "python.linting.pylintEnabled": true
}
```

### Local Development
1. **Clone and Setup**
   ```bash
   git clone https://github.com/your-org/startup-metrics
   cd startup-metrics
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Configure local environment variables
   ```

3. **Start Services**
   ```bash
   docker-compose up -d
   npm run dev
   ```

## Code Standards

### TypeScript Guidelines
- Use TypeScript strict mode
- Follow ESLint configuration
- Use interfaces over types when possible
- Document public APIs using JSDoc
- Maximum complexity: 10
- Maximum file length: 400 lines

Example:
```typescript
interface MetricDefinition {
  id: string;
  name: string;
  category: MetricCategory;
  validation: ValidationRule[];
}
```

### Python Guidelines
- Follow PEP 8
- Use type hints
- Use dataclasses for data containers
- Document using Google style docstrings
- Maximum complexity: 8
- Maximum file length: 300 lines

Example:
```python
from dataclasses import dataclass
from typing import List

@dataclass
class BenchmarkData:
    """Container for benchmark data.
    
    Attributes:
        metric_id: Unique identifier for the metric
        value: Numeric value of the benchmark
        period: Time period for the data
    """
    metric_id: str
    value: float
    period: str
```

### Testing Requirements
- Minimum 90% code coverage
- Unit tests required for all business logic
- Integration tests for API endpoints
- E2E tests for critical user flows
- Snapshot tests for UI components

Test structure:
```typescript
describe('MetricService', () => {
  beforeEach(() => {
    // Setup
  });

  it('should calculate correct NDR', () => {
    // Test implementation
  });

  afterEach(() => {
    // Cleanup
  });
});
```

### Code Review Process
**Checklist:**
- [ ] Meets code coverage requirements
- [ ] Follows style guidelines
- [ ] Includes documentation
- [ ] Contains appropriate tests
- [ ] No security vulnerabilities
- [ ] Performance impact considered
- [ ] Breaking changes documented

## CI/CD Pipeline

### GitHub Actions
Workflows:
1. **Build and Test**
   - Runs on pull requests
   - Builds all services
   - Executes test suites
   - Performs static analysis

2. **Security Scan**
   - SAST scanning
   - Dependency audit
   - Container scanning
   - License compliance check

3. **Deployment**
   - Staging deployment on PR merge
   - Production deployment on release tag
   - Automated rollback capability

### Quality Gates
Requirements for merge:
- All tests passing
- 90% code coverage
- No high/critical vulnerabilities
- SonarQube quality gate passed
- Required reviews completed
- Branch up to date

## Security

### Security Best Practices
1. **Code Security**
   - No secrets in code
   - Input validation required
   - Output encoding enforced
   - Proper error handling

2. **Data Handling**
   - Encrypt sensitive data
   - Use parameterized queries
   - Implement proper access controls
   - Follow data retention policies

3. **Infrastructure**
   - Use least privilege principle
   - Enable audit logging
   - Regular security updates
   - Network segmentation

### Vulnerability Reporting
1. **Reporting Process**
   - Email security@company.com
   - Use provided template
   - Include reproduction steps
   - Mark PR as security sensitive

2. **Response Timeline**
   - Acknowledgment: 24 hours
   - Assessment: 48 hours
   - Fix timeline: Based on severity
   - Disclosure: Coordinated

For questions or clarifications, contact the development team at dev@company.com.

---
Last updated: [Current Date]