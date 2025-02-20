import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  useTheme,
  useMediaQuery,
  Alert,
  Snackbar,
  IconButton,
  Tooltip,
  styled
} from '@mui/material'; // v5.14.0
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import RefreshIcon from '@mui/icons-material/Refresh';

// Internal imports
import MetricsList from '../components/metrics/MetricsList';
import MetricsTable from '../components/metrics/MetricsTable';
import { useMetrics } from '../hooks/useMetrics';
import { MetricCategory, MetricDataType } from '../types/metric.types';

// Styled components for enhanced visual presentation
const StyledPageContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(3),
  maxWidth: '100%',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(2),
  },
}));

const StyledHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
}));

const StyledViewControls = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
}));

// View type enum
enum ViewType {
  GRID = 'grid',
  TABLE = 'table',
}

// Interface for component props
interface MetricsPageProps {
  companyId: string;
}

/**
 * MetricsPage component providing a comprehensive interface for viewing and managing metrics
 * Implements Material Design principles with responsive layout and accessibility features
 */
const MetricsPage: React.FC<MetricsPageProps> = ({ companyId }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State management
  const [viewType, setViewType] = useState<ViewType>(() => {
    const savedView = localStorage.getItem('metricsViewType');
    return (savedView as ViewType) || ViewType.GRID;
  });
  const [selectedCategory, setSelectedCategory] = useState<MetricCategory | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Fetch metrics data using custom hook
  const { 
    metrics, 
    loading, 
    error, 
    fetchMetrics, 
    clearCache 
  } = useMetrics(companyId);

  // Memoized filtered metrics based on selected category
  const filteredMetrics = useMemo(() => {
    if (!selectedCategory) return metrics;
    return metrics.filter(metric => metric.category === selectedCategory);
  }, [metrics, selectedCategory]);

  // Handle view type change
  const handleViewChange = useCallback((newView: ViewType) => {
    setViewType(newView);
    localStorage.setItem('metricsViewType', newView);
    // Announce view change for screen readers
    const message = `View changed to ${newView === ViewType.GRID ? 'grid' : 'table'} view`;
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, []);

  // Handle category change
  const handleCategoryChange = useCallback((event: React.SyntheticEvent, newValue: MetricCategory | null) => {
    setSelectedCategory(newValue);
    setPage(0);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      await clearCache();
      await fetchMetrics(true);
      setSnackbar({
        open: true,
        message: 'Metrics refreshed successfully',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to refresh metrics',
        severity: 'error',
      });
    }
  }, [clearCache, fetchMetrics]);

  // Handle pagination
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  // Handle sorting
  const handleSort = useCallback((column: string, direction: 'asc' | 'desc') => {
    // Implement sorting logic here
  }, []);

  // Error handling
  if (error) {
    return (
      <StyledPageContainer>
        <Alert 
          severity="error"
          action={
            <IconButton
              color="inherit"
              size="small"
              onClick={handleRefresh}
              aria-label="Retry loading metrics"
            >
              <RefreshIcon />
            </IconButton>
          }
        >
          {error}
        </Alert>
      </StyledPageContainer>
    );
  }

  return (
    <StyledPageContainer role="main" aria-label="Metrics Dashboard">
      <StyledHeader>
        <Typography variant="h4" component="h1">
          Metrics Dashboard
        </Typography>
        <StyledViewControls>
          <Tooltip title="Refresh metrics">
            <IconButton onClick={handleRefresh} aria-label="Refresh metrics">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Switch to grid view">
            <IconButton
              onClick={() => handleViewChange(ViewType.GRID)}
              color={viewType === ViewType.GRID ? 'primary' : 'default'}
              aria-label="Grid view"
              aria-pressed={viewType === ViewType.GRID}
            >
              <ViewModuleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Switch to table view">
            <IconButton
              onClick={() => handleViewChange(ViewType.TABLE)}
              color={viewType === ViewType.TABLE ? 'primary' : 'default'}
              aria-label="Table view"
              aria-pressed={viewType === ViewType.TABLE}
            >
              <ViewListIcon />
            </IconButton>
          </Tooltip>
        </StyledViewControls>
      </StyledHeader>

      <Paper elevation={1}>
        <Tabs
          value={selectedCategory}
          onChange={handleCategoryChange}
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          aria-label="Metric categories"
        >
          <Tab 
            label="All"
            value={null}
            aria-label="Show all metrics"
          />
          {Object.values(MetricCategory).map((category) => (
            <Tab
              key={category}
              label={category}
              value={category}
              aria-label={`Show ${category.toLowerCase()} metrics`}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 2 }}>
        {viewType === ViewType.GRID ? (
          <MetricsList
            metrics={filteredMetrics}
            loading={loading}
            onMetricClick={() => {}}
            gridSpacing={2}
          />
        ) : (
          <MetricsTable
            metrics={filteredMetrics}
            loading={loading}
            page={page}
            pageSize={pageSize}
            total={filteredMetrics.length}
            onPageChange={handlePageChange}
            onSort={handleSort}
          />
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </StyledPageContainer>
  );
};

export default MetricsPage;