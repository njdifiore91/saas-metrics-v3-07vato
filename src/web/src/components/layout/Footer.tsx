import React, { memo, useCallback } from 'react';
import { Box, Container, Typography, Link, Stack } from '@mui/material'; // @mui/material v5.14.0
import { styled } from '@mui/material/styles'; // @mui/material/styles v5.14.0
import { useTheme } from '../../hooks/useTheme';

// Constants for footer height across breakpoints
const FOOTER_HEIGHT = {
  mobile: '56px',
  tablet: '64px',
  desktop: '72px'
};

// Footer navigation links with ARIA labels
const FOOTER_LINKS = [
  { label: 'Privacy Policy', path: '/privacy', ariaLabel: 'View Privacy Policy' },
  { label: 'Terms of Service', path: '/terms', ariaLabel: 'View Terms of Service' },
  { label: 'Contact', path: '/contact', ariaLabel: 'Contact Us' }
] as const;

// Styled footer component with theme-aware styles and responsive design
const StyledFooter = styled(Box)(({ theme }) => ({
  width: '100%',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  position: 'relative',
  height: FOOTER_HEIGHT.mobile,
  display: 'flex',
  alignItems: 'center',
  
  [theme.breakpoints.up('sm')]: {
    height: FOOTER_HEIGHT.tablet,
    padding: theme.spacing(2, 3),
  },
  
  [theme.breakpoints.up('md')]: {
    height: FOOTER_HEIGHT.desktop,
    padding: theme.spacing(2, 4),
  }
}));

/**
 * Footer component providing consistent branding, navigation, and accessibility
 * across the application. Implements responsive design and theme support.
 */
const Footer: React.FC = memo(() => {
  const { theme, isDarkMode } = useTheme();
  const currentYear = new Date().getFullYear();

  // Memoized link rendering with accessibility support
  const renderLinks = useCallback(() => (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={{ xs: 1, sm: 2, md: 3 }}
      component="nav"
      aria-label="Footer navigation"
    >
      {FOOTER_LINKS.map(({ label, path, ariaLabel }) => (
        <Link
          key={path}
          href={path}
          color="inherit"
          underline="hover"
          aria-label={ariaLabel}
          sx={{
            typography: 'body2',
            transition: theme.transitions.create('color'),
            '&:hover': {
              color: theme.palette.primary.main,
            },
            '&:focus': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: '2px',
            },
          }}
        >
          {label}
        </Link>
      ))}
    </Stack>
  ), [theme.palette.primary.main, theme.transitions]);

  // Memoized copyright section with semantic markup
  const renderCopyright = useCallback(() => (
    <Typography
      variant="body2"
      color="text.secondary"
      component="div"
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
      }}
    >
      <span aria-label="Copyright">©</span>
      {currentYear}{' '}
      <Typography
        component="span"
        variant="body2"
        color="primary"
        sx={{ fontWeight: 'medium' }}
      >
        Startup Metrics Platform
      </Typography>
      <span className="sr-only"> - All rights reserved</span>
    </Typography>
  ), [currentYear]);

  return (
    <StyledFooter
      component="footer"
      role="contentinfo"
      aria-label="Site footer"
    >
      <Container
        maxWidth="lg"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'center', sm: 'center' },
          gap: { xs: 2, sm: 0 },
        }}
      >
        {renderCopyright()}
        {renderLinks()}
      </Container>
    </StyledFooter>
  );
});

Footer.displayName = 'Footer';

export default Footer;