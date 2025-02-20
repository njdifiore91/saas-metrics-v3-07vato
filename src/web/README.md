# Startup Metrics Benchmarking Platform Frontend

## Overview

The Startup Metrics Benchmarking Platform frontend is a modern, enterprise-grade React application built with TypeScript. It provides comprehensive benchmark data visualization and comparison tools for startup metrics analysis.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0
- Docker >= 24.0.0
- Git >= 2.40.0
- VSCode (recommended)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test
```

## Technology Stack

- **Core Framework**: React 18.2.0
- **State Management**: Redux Toolkit 1.9.5
- **UI Components**: Material-UI 5.14.0
- **Data Visualization**: D3.js 7.8.5, Chart.js 4.4.0
- **Form Handling**: React Hook Form 7.45.0
- **Type System**: TypeScript 5.1.6
- **Build Tool**: Vite 4.3.9
- **Testing**: Jest 29.5.0, React Testing Library 14.0.0

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Reusable UI components
├── config/         # Configuration files
├── features/       # Feature-based modules
├── hooks/          # Custom React hooks
├── layouts/        # Page layouts
├── lib/            # Utility functions
├── pages/          # Route pages
├── services/       # API services
├── store/          # Redux store configuration
├── styles/         # Global styles
└── types/          # TypeScript type definitions
```

## Development

### Environment Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local`
4. Configure environment variables

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run type-check` - Run TypeScript checks
- `npm run format` - Format code with Prettier

### Code Quality

- ESLint configuration enforces strict TypeScript rules
- Prettier ensures consistent code formatting
- Jest and React Testing Library for comprehensive testing
- Axe Core for accessibility testing

### Performance Optimization

- Code splitting with React.lazy()
- Image optimization with modern formats
- Efficient bundle size management
- Performance monitoring with Lighthouse

## Testing Strategy

### Unit Tests

- Component testing with React Testing Library
- Hook testing with @testing-library/react-hooks
- Redux store testing
- Utility function testing

### Integration Tests

- Feature-level integration tests
- API integration testing
- Redux integration testing

### End-to-End Tests

- Critical user flows
- Cross-browser testing
- Performance testing

## Security

### Authentication

- Google OAuth 2.0 integration
- JWT token management
- Secure session handling

### Data Protection

- HTTPS enforcement
- Input sanitization
- XSS prevention
- CSRF protection

## Deployment

### Build Process

1. Run type checks: `npm run type-check`
2. Run tests: `npm run test`
3. Build application: `npm run build`
4. Deploy to AWS infrastructure

### CI/CD Pipeline

- GitHub Actions workflow
- Automated testing
- Build verification
- AWS deployment

### Environments

- Development: Dynamic feature branches
- Staging: Release candidates
- Production: Tagged releases

## Browser Support

### Production

- Chrome (last 2 versions)
- Firefox (last 2 versions)
- Safari (last 2 versions)
- Edge (last 2 versions)

### Development

- Chrome (last version)
- Firefox (last version)
- Safari (last version)
- Edge (last version)

## Contributing

### Pull Request Process

1. Create feature branch
2. Implement changes
3. Add tests
4. Update documentation
5. Submit PR for review

### Code Review Guidelines

- Code quality standards
- Test coverage requirements
- Performance considerations
- Security review

## Troubleshooting

### Common Issues

1. Node version mismatch
   - Solution: Use nvm to install correct version

2. Build failures
   - Check TypeScript errors
   - Verify dependency versions
   - Clear cache: `npm clean-cache`

3. Test failures
   - Check test environment
   - Verify mock data
   - Review test coverage

### Debug Tools

- React Developer Tools
- Redux DevTools
- Chrome DevTools
- VS Code Debugger

## Support

For technical support:
- Review documentation
- Check issue tracker
- Contact development team

## License

Copyright © 2023 Startup Metrics Platform. All rights reserved.