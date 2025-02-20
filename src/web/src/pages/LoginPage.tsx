import React, { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // v6.14.0
import { styled } from '@mui/material'; // v5.14.0
import GoogleAuthButton from '../components/auth/GoogleAuthButton';
import Card from '../components/common/Card';
import useAuth from '../hooks/useAuth';

// Styled components with theme-aware styling and F-pattern layout
const StyledContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  transition: theme.transitions.create(['background-color'], {
    duration: theme.transitions.duration.standard,
  }),
}));

const StyledCard = styled(Card)(({ theme }) => ({
  width: '100%',
  maxWidth: 400,
  textAlign: 'center',
  marginTop: theme.spacing(4),
  padding: theme.spacing(4),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),

  // F-pattern layout optimization
  '& > *:nth-of-type(odd)': {
    alignSelf: 'flex-start',
  },
  '& > *:nth-of-type(even)': {
    alignSelf: 'flex-end',
  },
}));

const Logo = styled('img')({
  width: 'auto',
  height: 48,
  marginBottom: 24,
});

const WelcomeText = styled('h1')(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: '1.5rem',
  fontWeight: 500,
  marginBottom: theme.spacing(2),
  // WCAG AA compliance for text contrast
  '@media (prefers-contrast: more)': {
    fontWeight: 600,
  },
}));

const SubText = styled('p')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: '1rem',
  marginBottom: theme.spacing(4),
  maxWidth: '80%',
  margin: '0 auto',
}));

/**
 * LoginPage component providing Google OAuth 2.0 authentication with
 * Material Design styling and WCAG 2.1 Level AA compliance
 */
const LoginPage: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { handleGoogleLogin, isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Handle successful login
  const handleLoginSuccess = useCallback(async (user: any) => {
    try {
      await handleGoogleLogin(user);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  }, [handleGoogleLogin, navigate]);

  // Handle login errors
  const handleLoginError = useCallback((error: Error) => {
    console.error('Login error:', error);
    // Error handling is managed by GoogleAuthButton component
  }, []);

  return (
    <StyledContainer role="main" aria-label="Login page">
      <StyledCard
        elevation={3}
        aria-label="Login card"
      >
        <Logo
          src="/logo.svg"
          alt="Startup Metrics Platform Logo"
          role="img"
        />
        
        <WelcomeText>
          Welcome to Startup Metrics Platform
        </WelcomeText>
        
        <SubText>
          Sign in with your Google account to access comprehensive benchmark data
          and personalized comparisons.
        </SubText>

        <GoogleAuthButton
          onSuccess={handleLoginSuccess}
          onError={handleLoginError}
          loading={isLoading}
          fullWidth
          size="large"
          aria-label="Sign in with Google"
        />
      </StyledCard>
    </StyledContainer>
  );
});

// Display name for debugging
LoginPage.displayName = 'LoginPage';

export default LoginPage;