import React from 'react'; // react v18.2.0
import { Typography, styled } from '@mui/material'; // @mui/material v5.14.0
import Card from '../common/Card';
import { formatMetricValue } from '../../utils/format.utils';
import { MetricDataType } from '../../types/metric.types';

// Props interface with comprehensive type safety
interface MetricCardProps {
  title: string;
  value: number;
  dataType: MetricDataType;
  precision?: number;
  description?: string;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onClick?: () => void;
  ariaLabel?: string;
}

// Styled wrapper for the Card component with metric-specific styling and theme support
const StyledMetricCard = styled(Card)(({ theme }) => ({
  height: '100%',
  minHeight: theme.spacing(20),
  display: 'flex',
  flexDirection: 'column',
  transition: theme.transitions.create(['opacity', 'transform', 'box-shadow'], {
    duration: theme.transitions.duration.standard,
  }),
  
  // Consistent spacing using 8px grid system
  padding: theme.spacing(3),
  margin: theme.spacing(1),
  
  // Loading state styles
  '&.loading': {
    opacity: 0.7,
    pointerEvents: 'none',
  },
  
  // Error state styles
  '&.error': {
    borderColor: theme.palette.error.main,
    backgroundColor: theme.palette.error.light,
    '& .error-message': {
      color: theme.palette.error.main,
    },
  },
  
  // Interactive state styles
  '&:hover': {
    transform: 'translateY(-2px)',
  },
  
  // Ensure proper contrast for accessibility
  '& .metric-title': {
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
  },
  
  '& .metric-value': {
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1),
  },
  
  '& .metric-description': {
    color: theme.palette.text.secondary,
  },
}));

/**
 * A reusable dashboard component that displays individual metric data with proper
 * formatting, styling, and interactive features. Supports various metric types,
 * data visualization, theme modes, and meets WCAG 2.1 Level AA accessibility standards.
 */
const MetricCard: React.FC<MetricCardProps> = React.memo(({
  title,
  value,
  dataType,
  precision = 2,
  description,
  loading = false,
  error = false,
  errorMessage,
  onClick,
  ariaLabel,
}) => {
  // Format the metric value using the utility function
  const formattedValue = React.useMemo(() => {
    if (error) return 'Error';
    if (loading) return '—';
    return formatMetricValue(value, dataType, precision);
  }, [value, dataType, precision, error, loading]);

  // Handle keyboard interactions for accessibility
  const handleKeyPress = React.useCallback((event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onClick();
    }
  }, [onClick]);

  return (
    <StyledMetricCard
      interactive={!!onClick}
      onClick={onClick}
      onKeyPress={handleKeyPress}
      className={`metric-card ${loading ? 'loading' : ''} ${error ? 'error' : ''}`}
      aria-label={ariaLabel || `${title} metric card`}
      aria-busy={loading}
      aria-invalid={error}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
    >
      <Typography
        variant="h6"
        component="h3"
        className="metric-title"
        gutterBottom
      >
        {title}
      </Typography>

      <Typography
        variant="h4"
        component="div"
        className="metric-value"
        dangerouslySetInnerHTML={{ __html: formattedValue }}
      />

      {description && (
        <Typography
          variant="body2"
          className="metric-description"
          color="textSecondary"
        >
          {description}
        </Typography>
      )}

      {error && errorMessage && (
        <Typography
          variant="caption"
          className="error-message"
          role="alert"
        >
          {errorMessage}
        </Typography>
      )}
    </StyledMetricCard>
  );
});

// Display name for debugging
MetricCard.displayName = 'MetricCard';

export default MetricCard;