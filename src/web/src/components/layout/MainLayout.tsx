import React, { useState, useCallback } from 'react';
import { Box, Container, useMediaQuery } from '@mui/material'; // @mui/material v5.14.0
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.14.0

// Internal imports
import Header from './Header';
import Navigation from './Navigation';
import Footer from './Footer';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useTheme } from '../../hooks/useTheme';

// Constants for layout measurements
const NAVIGATION_WIDTH = 240;
const HEADER_HEIGHT = {
  mobile: '56px',
  tablet: '64px',
  desktop: '72px'
};
const CONTENT_PADDING = {
  mobile: '16px',
  tablet: '24px',
  desktop: '32px'
};

// Props interface for MainLayout
interface MainLayoutProps {
  children: React.ReactNode;
}

// Styled main content area with responsive padding and theme support
const StyledMain = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  width: '100%',
  minHeight: `calc(100vh - ${HEADER_HEIGHT.mobile})`,
  padding: CONTENT_PADDING.mobile,
  transition: theme.transitions.create(['margin', 'padding'], {
    easing: theme.transitions.easing.sharp,
    duration: 225,
  }),
  backgroundColor: theme.palette.background.default,

  [theme.breakpoints.up('sm')]: {
    minHeight: `calc(100vh - ${HEADER_HEIGHT.tablet})`,
    padding: CONTENT_PADDING.tablet,
  },

  [theme.breakpoints.up('md')]: {
    minHeight: `calc(100vh - ${HEADER_HEIGHT.desktop})`,
    padding: CONTENT_PADDING.desktop,
    marginLeft: NAVIGATION_WIDTH,
  },
}));

// Styled container for content with max width and responsive margins
const StyledContainer = styled(Container)(({ theme }) => ({
  maxWidth: '100%',
  [theme.breakpoints.up('lg')]: {
    maxWidth: '1440px',
  },
}));

/**
 * MainLayout component providing the core application structure with
 * responsive behavior, theme support, and accessibility features.
 */
const MainLayout: React.FC<MainLayoutProps> = React.memo(({ children }) => {
  // Get current theme and breakpoint information
  const { theme } = useTheme();
  const { current: { isMobile } } = useBreakpoint();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // Navigation state management
  const [isNavigationOpen, setIsNavigationOpen] = useState(!isMobile);

  // Handle navigation toggle with performance optimization
  const handleNavigationToggle = useCallback(() => {
    setIsNavigationOpen(prev => !prev);
  }, []);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        backgroundColor: theme.palette.background.default,
      }}
    >
      {/* Header with navigation controls */}
      <Header
        onMenuClick={handleNavigationToggle}
        elevation={1}
      />

      {/* Main content area with navigation and content */}
      <Box
        sx={{
          display: 'flex',
          flex: 1,
          pt: {
            xs: `${HEADER_HEIGHT.mobile}`,
            sm: `${HEADER_HEIGHT.tablet}`,
            md: `${HEADER_HEIGHT.desktop}`,
          },
        }}
      >
        {/* Navigation drawer */}
        <Navigation
          onMenuClick={handleNavigationToggle}
          aria-label="Main navigation"
        />

        {/* Main content */}
        <StyledMain
          component="main"
          role="main"
          aria-label="Main content"
        >
          <StyledContainer>
            {children}
          </StyledContainer>
        </StyledMain>
      </Box>

      {/* Footer */}
      <Footer />
    </Box>
  );
});

// Display name for debugging
MainLayout.displayName = 'MainLayout';

export default MainLayout;