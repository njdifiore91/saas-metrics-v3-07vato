// React v18.2.0
import React, { useState, useCallback, useMemo } from 'react';
// Material-UI v5.14.0
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Collapse 
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Dashboard, 
  Assessment, 
  Settings, 
  ExpandMore, 
  ExpandLess 
} from '@mui/icons-material';

// Internal imports
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useAuth } from '../../hooks/useAuth';
import { UI_CONSTANTS } from '../../config/constants';

// Constants
const DRAWER_WIDTH = 240;
const TRANSITION_DURATION = 225;

// Interfaces
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
  customStyles?: React.CSSProperties;
  disableTransition?: boolean;
  onNavigate?: (path: string, analytics?: Record<string, any>) => void;
}

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  roles?: string[];
  permissions?: string[];
  isExpandable?: boolean;
  children?: NavigationItem[];
  analytics?: Record<string, any>;
}

// Enhanced styled drawer with GPU acceleration and responsive behavior
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
    overflowX: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
      width: '100%',
    },
  },
  '& .MuiListItem-root': {
    padding: theme.spacing(UI_CONSTANTS.SPACING.BASE / 8),
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    '&:hover': {
      backgroundColor: theme.palette.action.hover,
    },
  },
}));

// Navigation items configuration with role-based access
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: 'Dashboard',
    roles: ['user', 'admin'],
    analytics: { category: 'navigation', action: 'view_dashboard' }
  },
  {
    id: 'metrics',
    label: 'Metrics',
    path: '/metrics',
    icon: 'Assessment',
    roles: ['user', 'admin'],
    isExpandable: true,
    children: [
      {
        id: 'revenue',
        label: 'Revenue Metrics',
        path: '/metrics/revenue',
        roles: ['user', 'admin']
      }
    ]
  },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: 'Settings',
    roles: ['admin']
  }
];

// Main Sidebar component with enhanced features
export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onClose,
  onToggle,
  variant = 'permanent',
  customStyles,
  disableTransition = false,
  onNavigate
}) => {
  // Hooks
  const { isMobile, isTablet } = useBreakpoint();
  const { user, checkRole } = useAuth();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Memoized responsive variant
  const drawerVariant = useMemo(() => {
    if (isMobile || isTablet) return 'temporary';
    return variant;
  }, [isMobile, isTablet, variant]);

  // Handle navigation with analytics
  const handleNavigation = useCallback((item: NavigationItem) => {
    if (onNavigate) {
      onNavigate(item.path, item.analytics);
    }
    if (isMobile || isTablet) {
      onClose();
    }
  }, [onNavigate, isMobile, isTablet, onClose]);

  // Handle expandable items
  const handleExpand = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  // Render navigation item with proper icon
  const renderIcon = useCallback((iconName?: string) => {
    switch (iconName) {
      case 'Dashboard':
        return <Dashboard />;
      case 'Assessment':
        return <Assessment />;
      case 'Settings':
        return <Settings />;
      default:
        return null;
    }
  }, []);

  // Render navigation items recursively
  const renderNavigationItems = useCallback((items: NavigationItem[], level = 0) => {
    return items.map(item => {
      // Check user permissions
      if (item.roles && (!user || !item.roles.some(role => checkRole(role)))) {
        return null;
      }

      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;

      return (
        <React.Fragment key={item.id}>
          <ListItem
            button
            onClick={() => hasChildren ? handleExpand(item.id) : handleNavigation(item)}
            sx={{ pl: level * 2 }}
            role="menuitem"
            aria-expanded={hasChildren ? isExpanded : undefined}
          >
            {item.icon && (
              <ListItemIcon>
                {renderIcon(item.icon)}
              </ListItemIcon>
            )}
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                variant: 'body2',
                color: 'textPrimary'
              }}
            />
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItem>
          {hasChildren && (
            <Collapse 
              in={isExpanded} 
              timeout="auto" 
              unmountOnExit
              role="region"
              aria-label={`${item.label} submenu`}
            >
              <List component="div" disablePadding>
                {renderNavigationItems(item.children, level + 1)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  }, [expandedItems, user, checkRole, handleNavigation, handleExpand, renderIcon]);

  return (
    <StyledDrawer
      variant={drawerVariant}
      open={isOpen}
      onClose={onClose}
      sx={{
        ...customStyles,
        '& .MuiDrawer-paper': {
          transition: disableTransition ? 'none' : undefined,
        },
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <List component="nav" aria-label="Main menu">
        {renderNavigationItems(NAVIGATION_ITEMS)}
      </List>
      <Divider />
    </StyledDrawer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;