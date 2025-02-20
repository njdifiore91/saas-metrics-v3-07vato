import React, { useCallback, useEffect, useState } from 'react';
import { Box, Container, Fade } from '@mui/material';
import { styled } from '@mui/material/styles';
import { ErrorBoundary } from 'react-error-boundary';

// Internal imports
import { Header } from '../layout/Header';
import { Sidebar } from './Sidebar';
import { useBreakpoint } from '../../hooks/useBreakpoint';

// Constants for layout dimensions
const SIDEBAR_WIDTH = 240;
const GRID_SPACING = 8;
const THEME_TRANSITION_DURATION = 300;

// Interface for Layout component props
interface LayoutProps {
  children: React.ReactNode;
  isLoading?: boolean;
  role?: string;
  onError?: (error: Error, info: { componentStack: string }) => void;
}

// Styled main content area with responsive behavior and theme support
const StyledMain = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(3),
  transition: theme.transitions.create(['margin', 'width'], {
    easing: theme.transitions.easing.sharp,
    duration: THEME_TRANSITION_DURATION,
  }),
  marginLeft: 0,
  width: '100%',
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  display: 'flex',
  flexDirection: 'column',
  contain: 'content',

  [theme.breakpoints.up('md')]: {
    marginLeft: SIDEBAR_WIDTH,
    width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
  },

  // Apply 8px grid system
  '& > *': {
    margin: theme.spacing(GRID_SPACING / 8),
  },

  // Ensure proper spacing for F-pattern layout
  '& > *:first-of-type': {
    marginTop: theme.spacing(GRID_SPACING),
  },
}));

// Main Layout component with accessibility and responsive features
export const Layout: React.FC<LayoutProps> = ({
  children,
  isLoading = false,
  role = 'main',
  onError
}) => {
  // Hooks for responsive behavior
  const { isMobile } = useBreakpoint();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  // Handle sidebar toggle with accessibility
  const handleSidebarToggle = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Update sidebar state on breakpoint changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && isSidebarOpen && isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isSidebarOpen, isMobile]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <ErrorBoundary
      fallback={<div>Something went wrong</div>}
      onError={onError}
    >
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          backgroundColor: 'background.default',
        }}
      >
        {/* Header with theme toggle and navigation */}
        <Header
          onMenuClick={handleSidebarToggle}
          className="layout-header"
          elevation={1}
        />

        {/* Responsive sidebar with role-based access */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggle={handleSidebarToggle}
          variant={isMobile ? 'temporary' : 'permanent'}
        />

        {/* Main content area with loading state */}
        <StyledMain
          component="main"
          role={role}
          aria-busy={isLoading}
          className="layout-main"
        >
          <Container
            maxWidth="xl"
            sx={{
              pt: { xs: 8, sm: 9 },
              pb: { xs: 8, sm: 9 },
              px: { xs: 2, sm: 3 },
            }}
          >
            <Fade in={!isLoading} timeout={THEME_TRANSITION_DURATION}>
              <Box>{children}</Box>
            </Fade>
          </Container>
        </StyledMain>
      </Box>
    </ErrorBoundary>
  );
};

// Default export
export default Layout;