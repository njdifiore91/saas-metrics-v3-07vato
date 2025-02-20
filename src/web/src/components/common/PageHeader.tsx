import React from 'react';
import { Box, Typography, Stack } from '@mui/material'; // @mui/material v5.14.0
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.14.0

// Internal imports
import Breadcrumbs from './Breadcrumbs';
import Button from './Button';

/**
 * Props interface for the PageHeader component with accessibility enhancements
 */
interface PageHeaderProps {
  /** Main title of the page */
  title: string;
  /** Optional subtitle for additional context */
  subtitle?: string;
  /** Optional action buttons to display in the header */
  actions?: React.ReactNode;
  /** Whether to show breadcrumb navigation */
  showBreadcrumbs?: boolean;
  /** Accessibility label for the header */
  'aria-label'?: string;
  /** Test ID for the component */
  'data-testid'?: string;
}

/**
 * Styled header container with proper spacing and layout following 8px grid system
 */
const StyledHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  backgroundColor: theme.palette.background.paper,
  borderBottom: `1px solid ${theme.palette.divider}`,
  marginBottom: theme.spacing(3),
  
  // Responsive padding adjustments
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },

  // Ensure proper contrast ratio for accessibility
  '& .MuiTypography-root': {
    color: theme.palette.text.primary,
  },

  // Proper spacing between elements
  '& > *:not(:last-child)': {
    marginBottom: theme.spacing(1),
  },
}));

/**
 * A reusable page header component that provides consistent header styling,
 * breadcrumb navigation, and action buttons following Material Design guidelines
 * and WCAG accessibility standards.
 */
const PageHeader: React.FC<PageHeaderProps> = React.memo(({
  title,
  subtitle,
  actions,
  showBreadcrumbs = true,
  'aria-label': ariaLabel = 'Page header',
  'data-testid': testId = 'page-header',
}) => {
  /**
   * Renders action buttons with proper spacing and accessibility
   */
  const renderActions = (actions: React.ReactNode) => {
    if (!actions) return null;

    return (
      <Stack
        direction="row"
        spacing={2}
        sx={{
          marginLeft: 'auto',
          [theme => theme.breakpoints.down('sm')]: {
            marginTop: 2,
            width: '100%',
          },
        }}
      >
        {actions}
      </Stack>
    );
  };

  return (
    <StyledHeader
      component="header"
      role="banner"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {/* Breadcrumb navigation with accessibility support */}
      {showBreadcrumbs && (
        <Breadcrumbs
          aria-label="Page navigation"
          showHome={true}
          role="navigation"
        />
      )}

      {/* Header content with proper heading hierarchy */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        <Box flex={1}>
          <Typography
            variant="h1"
            component="h1"
            sx={{
              fontSize: { xs: '1.5rem', sm: '2rem' },
              fontWeight: 600,
              lineHeight: 1.2,
              marginBottom: subtitle ? 1 : 0,
            }}
          >
            {title}
          </Typography>
          
          {subtitle && (
            <Typography
              variant="subtitle1"
              color="text.secondary"
              sx={{
                fontSize: { xs: '0.875rem', sm: '1rem' },
                lineHeight: 1.5,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Action buttons */}
        {renderActions(actions)}
      </Box>
    </StyledHeader>
  );
});

// Display name for debugging
PageHeader.displayName = 'PageHeader';

// Default props
PageHeader.defaultProps = {
  showBreadcrumbs: true,
  'aria-label': 'Page header',
  'data-testid': 'page-header',
};

export default PageHeader;