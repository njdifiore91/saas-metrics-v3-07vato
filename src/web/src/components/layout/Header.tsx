import React, { useCallback, useState, useRef, useEffect } from 'react';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Avatar, 
  useMediaQuery,
  Skeleton,
  CircularProgress,
  Menu,
  MenuItem,
  Divider,
  Box,
  useTheme as useMuiTheme
} from '@mui/material'; // @mui/material v5.14.0
import { 
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  AccountCircle,
  Error as ErrorIcon
} from '@mui/icons-material'; // @mui/icons-material v5.14.0
import styled from '@emotion/styled'; // @emotion/styled v11.11.0

// Internal imports
import { Button } from '../common/Button';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

// Styled components with proper accessibility and theme support
const StyledAppBar = styled(AppBar)`
  ${({ theme }) => `
    background-color: ${theme.palette.background.paper};
    color: ${theme.palette.text.primary};
    transition: ${theme.transitions.create(['background-color', 'color'])};
  `}
`;

const StyledToolbar = styled(Toolbar)`
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing(0, 2)};
  min-height: 64px;

  @media (max-width: ${({ theme }) => theme.breakpoints.values.sm}px) {
    padding: ${({ theme }) => theme.spacing(0, 1)};
    min-height: 56px;
  }
`;

const LogoSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

const ActionSection = styled(Box)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
`;

// Interface for component props
interface HeaderProps {
  onMenuClick: () => void;
  className?: string;
  elevation?: number;
}

// Main Header component with accessibility enhancements
export const Header: React.FC<HeaderProps> = React.memo(({
  onMenuClick,
  className,
  elevation = 1
}) => {
  // Hooks
  const { user, isAuthenticated, handleLogout, loading } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));

  // State and refs
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuId = 'primary-account-menu';
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Handle profile menu
  const handleProfileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle logout with confirmation
  const handleLogoutClick = useCallback(async () => {
    try {
      await handleLogout();
      handleProfileMenuClose();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [handleLogout, handleProfileMenuClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && anchorEl) {
        handleProfileMenuClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [anchorEl, handleProfileMenuClose]);

  // Render profile menu
  const renderProfileMenu = (
    <Menu
      id={menuId}
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleProfileMenuClose}
      keepMounted
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      role="menu"
      aria-labelledby="profile-button"
    >
      <MenuItem 
        onClick={handleProfileMenuClose}
        role="menuitem"
      >
        Profile
      </MenuItem>
      <MenuItem 
        onClick={handleProfileMenuClose}
        role="menuitem"
      >
        Settings
      </MenuItem>
      <Divider />
      <MenuItem 
        onClick={handleLogoutClick}
        role="menuitem"
      >
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <StyledAppBar 
      position="fixed" 
      className={className}
      elevation={elevation}
      component="header"
      role="banner"
    >
      <StyledToolbar>
        <LogoSection>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={onMenuClick}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            variant="h6"
            component="h1"
            noWrap
            sx={{ display: { xs: 'none', sm: 'block' } }}
          >
            Startup Metrics Platform
          </Typography>
        </LogoSection>

        <ActionSection>
          <IconButton
            aria-label={isDarkMode ? 'switch to light mode' : 'switch to dark mode'}
            onClick={toggleTheme}
            color="inherit"
            size="large"
          >
            {isDarkMode ? <Brightness7 /> : <Brightness4 />}
          </IconButton>

          {loading ? (
            <Skeleton 
              variant="circular" 
              width={40} 
              height={40}
              aria-label="loading user profile"
            />
          ) : isAuthenticated && user ? (
            <IconButton
              ref={menuButtonRef}
              aria-label="account settings"
              aria-controls={menuId}
              aria-haspopup="true"
              aria-expanded={Boolean(anchorEl)}
              onClick={handleProfileMenuOpen}
              color="inherit"
              size="large"
              id="profile-button"
            >
              {user.email ? (
                <Avatar 
                  alt={`${user.email}'s profile`}
                  src={`https://www.gravatar.com/avatar/${user.email}?d=mp`}
                />
              ) : (
                <AccountCircle />
              )}
            </IconButton>
          ) : (
            <Button
              variant="outlined"
              color="inherit"
              size="small"
              aria-label="sign in"
              href="/login"
            >
              Sign In
            </Button>
          )}
        </ActionSection>
      </StyledToolbar>
      {renderProfileMenu}
    </StyledAppBar>
  );
});

// Display name for debugging
Header.displayName = 'Header';

export default Header;