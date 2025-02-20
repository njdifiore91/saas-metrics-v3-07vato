import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  styled,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Assessment,
  Settings,
  ChevronLeft
} from '@mui/icons-material';

// Internal imports
import { ROUTES } from '../../config/routes.config';
import useAuth from '../../hooks/useAuth';
import useBreakpoint from '../../hooks/useBreakpoint';

// Constants
const DRAWER_WIDTH = 240;
const MOBILE_DRAWER_WIDTH = '100%';
const TRANSITION_DURATION = 225;

// Interfaces
interface NavigationProps {
  onMenuClick: () => void;
  className?: string;
  ariaLabel?: string;
}

interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  analytics?: {
    category: string;
    action: string;
  };
}

// Styled components
const StyledAppBar = styled(AppBar, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isMobile',
})<{ open?: boolean; isMobile?: boolean }>(({ theme, open, isMobile }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION,
  }),
  ...(open && !isMobile && {
    marginLeft: DRAWER_WIDTH,
    width: `calc(100% - ${DRAWER_WIDTH}px)`,
  }),
}));

const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'open' && prop !== 'isMobile',
})<{ open?: boolean; isMobile?: boolean }>(({ theme, open, isMobile }) => ({
  width: isMobile ? MOBILE_DRAWER_WIDTH : DRAWER_WIDTH,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  '& .MuiDrawer-paper': {
    width: isMobile ? MOBILE_DRAWER_WIDTH : DRAWER_WIDTH,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
    overflowX: 'hidden',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

// Navigation items configuration
const NAVIGATION_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: ROUTES.DASHBOARD.path,
    icon: <Dashboard />,
    roles: ['COMPANY_USER', 'ANALYST', 'ADMIN'],
    analytics: { category: 'navigation', action: 'dashboard_view' }
  },
  {
    id: 'metrics',
    label: 'Metrics',
    path: ROUTES.METRICS.path,
    icon: <Assessment />,
    roles: ['COMPANY_USER', 'ANALYST', 'ADMIN'],
    analytics: { category: 'navigation', action: 'metrics_view' }
  },
  {
    id: 'benchmarks',
    label: 'Benchmarks',
    path: ROUTES.BENCHMARKS.path,
    icon: <Assessment />,
    roles: ['ANALYST', 'ADMIN'],
    analytics: { category: 'navigation', action: 'benchmarks_view' }
  },
  {
    id: 'settings',
    label: 'Settings',
    path: ROUTES.SETTINGS.path,
    icon: <Settings />,
    roles: ['ADMIN'],
    analytics: { category: 'navigation', action: 'settings_view' }
  }
];

const Navigation: React.FC<NavigationProps> = ({
  onMenuClick,
  className,
  ariaLabel = 'Main navigation'
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { current: { isMobile } } = useBreakpoint();
  const [open, setOpen] = React.useState(!isMobile);

  // Filter navigation items based on user role
  const filteredNavItems = useMemo(() => 
    NAVIGATION_ITEMS.filter(item => 
      item.roles.includes(user?.role || '')
    ),
    [user?.role]
  );

  // Handle drawer toggle
  const handleDrawerToggle = useCallback(() => {
    setOpen(prev => !prev);
    onMenuClick();
  }, [onMenuClick]);

  // Handle navigation with analytics
  const handleNavigation = useCallback((path: string, analytics?: { category: string; action: string }) => {
    navigate(path);
    if (analytics) {
      // Analytics tracking would go here
      console.debug('Navigation analytics:', analytics);
    }
  }, [navigate]);

  // Check if route is active
  const isActiveRoute = useCallback((path: string): boolean => {
    return location.pathname === path;
  }, [location]);

  return (
    <>
      <StyledAppBar 
        position="fixed" 
        open={open} 
        isMobile={isMobile}
        className={className}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeft /> : <MenuIcon />}
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            Startup Metrics Platform
          </Typography>
        </Toolbar>
      </StyledAppBar>

      <StyledDrawer
        variant={isMobile ? "temporary" : "permanent"}
        open={open}
        isMobile={isMobile}
        onClose={isMobile ? handleDrawerToggle : undefined}
        aria-label={ariaLabel}
      >
        <Box role="navigation">
          <List>
            {filteredNavItems.map((item) => (
              <ListItem
                button
                key={item.id}
                onClick={() => handleNavigation(item.path, item.analytics)}
                selected={isActiveRoute(item.path)}
                aria-current={isActiveRoute(item.path) ? 'page' : undefined}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.action.selected,
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: 3,
                    justifyContent: 'center',
                    color: isActiveRoute(item.path) 
                      ? theme.palette.primary.main 
                      : 'inherit'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: isActiveRoute(item.path) 
                      ? 'primary' 
                      : 'textPrimary'
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      </StyledDrawer>
    </>
  );
};

export default React.memo(Navigation);