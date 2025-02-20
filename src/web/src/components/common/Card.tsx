import React from 'react'; // react v18.2.0
import { Card as MuiCard, CardContent, styled } from '@mui/material'; // @mui/material v5.14.0
import { lightTheme } from '../../assets/styles/theme';

// Props interface for the Card component
interface CardProps {
  children: React.ReactNode;
  variant?: 'elevation' | 'outlined';
  elevation?: number;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

// Styled wrapper for Material-UI Card with enhanced theming and interaction support
const StyledCard = styled(MuiCard, {
  shouldForwardProp: (prop) => prop !== 'interactive',
})<{ interactive?: boolean }>(({ theme, interactive }) => ({
  position: 'relative',
  transition: theme.transitions.create(['box-shadow', 'background-color'], {
    duration: theme.transitions.duration.standard,
  }),
  backgroundColor: theme.palette.background.paper,
  padding: theme.spacing(2),
  cursor: interactive ? 'pointer' : 'default',
  
  '&:hover': {
    ...(interactive && {
      boxShadow: theme.shadows[8],
      transform: 'translateY(-2px)',
      transition: theme.transitions.create(['box-shadow', 'transform'], {
        duration: theme.transitions.duration.shorter,
      }),
    }),
  },

  // Ensure consistent spacing based on 8px grid system
  '& .MuiCardContent-root': {
    padding: theme.spacing(2),
    '&:last-child': {
      paddingBottom: theme.spacing(2),
    },
  },

  // Theme mode transition
  '@media (prefers-reduced-motion: no-preference)': {
    transition: theme.transitions.create(['background-color', 'box-shadow'], {
      duration: theme.transitions.duration.standard,
    }),
  },
}));

/**
 * A reusable Material Design card component that serves as a container for content
 * with consistent styling, elevation, and theming support.
 * 
 * @param {CardProps} props - The component props
 * @returns {React.ReactElement} The rendered card component
 */
const CustomCard: React.FC<CardProps> = React.memo(({
  children,
  variant = 'elevation',
  elevation = 1,
  interactive = false,
  onClick,
  className,
}) => {
  // Handle keyboard interaction for accessibility
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === 'Space')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <StyledCard
      variant={variant}
      elevation={elevation}
      interactive={interactive}
      onClick={interactive ? onClick : undefined}
      onKeyPress={handleKeyPress}
      className={className}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-disabled={!interactive}
    >
      <CardContent>
        {children}
      </CardContent>
    </StyledCard>
  );
});

// Display name for debugging
CustomCard.displayName = 'CustomCard';

// Default export
export default CustomCard;