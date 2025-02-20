import React, { useMemo } from 'react';
import { Breadcrumbs as MuiBreadcrumbs, Link, Typography } from '@mui/material'; // @mui/material v5.14.0
import { NavigateNext } from '@mui/icons-material'; // @mui/icons-material v5.14.0
import { useLocation, Link as RouterLink } from 'react-router-dom'; // react-router-dom v6.14.0
import { ROUTES } from '../../config/routes.config';

/**
 * Props interface for the Breadcrumbs component
 */
interface BreadcrumbsProps {
  /** Accessibility label for the breadcrumb navigation */
  'aria-label'?: string;
  /** Whether to show the home link as first item */
  showHome?: boolean;
}

/**
 * Interface for individual breadcrumb items
 */
interface BreadcrumbItem {
  /** Display label for the breadcrumb */
  label: string;
  /** Navigation path for the breadcrumb */
  path: string;
  /** Whether this is the active/current item */
  isActive: boolean;
}

/**
 * Generates formatted breadcrumb items from the current pathname
 * @param pathname - Current location pathname
 * @returns Array of breadcrumb items
 */
const generateBreadcrumbs = (pathname: string): BreadcrumbItem[] => {
  // Remove trailing slashes and split path
  const paths = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  
  // Generate breadcrumb items
  return paths.map((path, index) => {
    // Format the label with proper capitalization
    const label = path
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Generate the full path up to this point
    const fullPath = `/${paths.slice(0, index + 1).join('/')}`;
    
    // Check if this is the last (active) item
    const isActive = index === paths.length - 1;

    return {
      label,
      path: fullPath,
      isActive
    };
  });
};

/**
 * A reusable breadcrumb navigation component that provides hierarchical
 * page navigation following Material Design guidelines and WCAG accessibility standards.
 */
const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  'aria-label': ariaLabel = 'Breadcrumb navigation',
  showHome = true
}) => {
  const location = useLocation();

  // Generate breadcrumb items with memoization
  const breadcrumbItems = useMemo(() => {
    const items = generateBreadcrumbs(location.pathname);
    
    // Add home item if requested
    if (showHome) {
      items.unshift({
        label: 'Dashboard',
        path: ROUTES.DASHBOARD.path,
        isActive: location.pathname === ROUTES.DASHBOARD.path
      });
    }
    
    return items;
  }, [location.pathname, showHome]);

  /**
   * Renders a single breadcrumb item with proper styling and accessibility
   * @param item - Breadcrumb item to render
   * @param index - Index of the item in the list
   * @param totalItems - Total number of items
   */
  const renderBreadcrumbItem = (
    item: BreadcrumbItem,
    index: number,
    totalItems: number
  ): JSX.Element => {
    // For the last (current) item
    if (item.isActive) {
      return (
        <Typography
          key={item.path}
          color="text.primary"
          aria-current="page"
          sx={{
            fontWeight: 500,
            fontSize: '0.875rem',
            lineHeight: 1.43
          }}
        >
          {item.label}
        </Typography>
      );
    }

    // For navigable items
    return (
      <Link
        key={item.path}
        component={RouterLink}
        to={item.path}
        color="text.secondary"
        underline="hover"
        sx={{
          fontSize: '0.875rem',
          lineHeight: 1.43,
          '&:hover': {
            color: 'primary.main'
          }
        }}
        onClick={(e: React.MouseEvent) => {
          // Prevent navigation if modifier keys are pressed
          if (e.metaKey || e.ctrlKey) return;
        }}
      >
        {item.label}
      </Link>
    );
  };

  // Don't render if there's only one item or no items
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <MuiBreadcrumbs
      aria-label={ariaLabel}
      separator={<NavigateNext fontSize="small" />}
      sx={{
        padding: theme => theme.spacing(1, 0),
        '& .MuiBreadcrumbs-separator': {
          margin: theme => theme.spacing(0, 0.5)
        }
      }}
    >
      {breadcrumbItems.map((item, index) => 
        renderBreadcrumbItem(item, index, breadcrumbItems.length)
      )}
    </MuiBreadcrumbs>
  );
};

export default Breadcrumbs;