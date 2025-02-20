import React from 'react';
import { Box, Typography, Container, useTheme } from '@mui/material'; // @mui/material v5.14.0
import { useNavigate } from 'react-router-dom'; // react-router-dom v6.14.0

// Internal imports
import Layout from '../components/common/Layout';
import Button from '../components/common/Button';

/**
 * NotFoundPage component that displays a user-friendly 404 error message
 * Implements Material Design principles and ensures WCAG 2.1 Level AA compliance
 */
const NotFoundPage: React.FC = React.memo(() => {
  // Hooks for navigation and theme
  const navigate = useNavigate();
  const theme = useTheme();

  /**
   * Handles navigation back to dashboard with error tracking
   */
  const handleNavigateHome = React.useCallback(() => {
    // Track 404 navigation event
    try {
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Navigation error:', error);
    }
  }, [navigate]);

  return (
    <Layout>
      <Container
        maxWidth="md"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          textAlign: 'center',
          // Apply 8px grid system
          py: { xs: 4, sm: 6, md: 8 },
          px: { xs: 2, sm: 3, md: 4 }
        }}
      >
        {/* Semantic heading hierarchy */}
        <Typography
          variant="h1"
          component="h1"
          sx={{
            fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
            fontWeight: 700,
            color: 'primary.main',
            mb: 2
          }}
          aria-label="404 Page Not Found"
        >
          404
        </Typography>

        <Typography
          variant="h2"
          sx={{
            fontSize: { xs: '1.5rem', sm: '2rem', md: '2.5rem' },
            fontWeight: 600,
            mb: 3,
            color: 'text.primary'
          }}
        >
          Page Not Found
        </Typography>

        <Box
          sx={{
            maxWidth: '600px',
            mb: 4
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontSize: { xs: '1rem', sm: '1.125rem' },
              color: 'text.secondary',
              lineHeight: 1.6,
              mb: 4
            }}
          >
            The page you are looking for might have been removed, had its name changed,
            or is temporarily unavailable.
          </Typography>
        </Box>

        {/* Accessible navigation button */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleNavigateHome}
          aria-label="Return to dashboard"
          sx={{
            minWidth: 200,
            py: 1.5,
            // Ensure touch target size for mobile
            [theme.breakpoints.down('sm')]: {
              width: '100%',
              maxWidth: '300px'
            }
          }}
        >
          Return to Dashboard
        </Button>
      </Container>
    </Layout>
  );
});

// Display name for debugging
NotFoundPage.displayName = 'NotFoundPage';

export default NotFoundPage;