import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Box, Paper, TextField, IconButton, styled, useTheme } from '@mui/material'; // @mui/material v5.14.0
import SearchIcon from '@mui/icons-material/Search'; // @mui/icons-material v5.14.0
import FilterListIcon from '@mui/icons-material/FilterList'; // @mui/icons-material v5.14.0
import debounce from 'lodash/debounce'; // lodash v4.17.21

import Loading from './Loading';
import Table from './Table';
import { PaginatedResponse } from '../../types/api.types';

// Enhanced DataGrid column interface with accessibility features
export interface DataGridColumn<T> {
  id: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  align?: 'left' | 'right' | 'center';
  width?: string;
  hideOnMobile?: boolean;
  ariaLabel?: string;
  renderCell?: (value: T[keyof T], row: T) => React.ReactNode;
  formatValue?: (value: T[keyof T]) => string;
  filterOptions?: Record<string, any>;
}

// Comprehensive DataGrid props interface
export interface DataGridProps<T> {
  columns: DataGridColumn<T>[];
  data: T[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  searchable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  virtualScroll?: boolean;
  ariaLabel?: string;
  noDataMessage?: string;
  onPageChange: (page: number, pageSize: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  onSearch?: (searchTerm: string) => void;
  onFilter?: (filters: Record<string, any>) => void;
  onSelectionChange?: (selectedRows: T[]) => void;
}

// Styled components with Material Design principles
const StyledGridContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  width: '100%',
  height: '100%',
  backgroundColor: theme.palette.background.default,
  [theme.breakpoints.down('sm')]: {
    gap: theme.spacing(1),
  },
}));

const StyledToolbar = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    alignItems: 'stretch',
    padding: theme.spacing(1),
  },
}));

const StyledSearchField = styled(TextField)(({ theme }) => ({
  minWidth: 250,
  [theme.breakpoints.down('sm')]: {
    minWidth: '100%',
  },
}));

// DataGrid component implementation
export const DataGrid = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  page = 0,
  pageSize = 10,
  total = 0,
  searchable = true,
  filterable = true,
  selectable = false,
  virtualScroll = false,
  ariaLabel = 'Data grid',
  noDataMessage = 'No data available',
  onPageChange,
  onSort,
  onSearch,
  onFilter,
  onSelectionChange,
}: DataGridProps<T>): React.ReactElement => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Memoized handlers for performance optimization
  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        onSearch?.(term);
      }, 300),
    [onSearch]
  );

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const term = event.target.value;
      setSearchTerm(term);
      debouncedSearch(term);
    },
    [debouncedSearch]
  );

  const handleFilter = useCallback(
    (newFilters: Record<string, any>) => {
      setFilters(newFilters);
      onFilter?.(newFilters);
    },
    [onFilter]
  );

  // Enhanced table columns with accessibility
  const tableColumns = useMemo(
    () =>
      columns.map((column) => ({
        id: column.id,
        label: column.label,
        sortable: column.sortable,
        align: column.align || 'left',
        minWidth: column.width ? parseInt(column.width) : undefined,
        format: column.renderCell || column.formatValue,
        ariaLabel: column.ariaLabel,
        tooltipText: column.label,
      })),
    [columns]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  return (
    <StyledGridContainer role="grid" aria-label={ariaLabel}>
      {(searchable || filterable) && (
        <StyledToolbar>
          {searchable && (
            <StyledSearchField
              placeholder="Search..."
              value={searchTerm}
              onChange={handleSearch}
              InputProps={{
                startAdornment: <SearchIcon color="action" />,
                'aria-label': 'Search input',
              }}
              size="small"
            />
          )}
          {filterable && (
            <IconButton
              aria-label="Show filters"
              onClick={() => handleFilter(filters)}
              color={Object.keys(filters).length > 0 ? 'primary' : 'default'}
            >
              <FilterListIcon />
            </IconButton>
          )}
        </StyledToolbar>
      )}

      <Table
        columns={tableColumns}
        data={data}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onSort={onSort}
        enableSelection={selectable}
        onSelectionChange={onSelectionChange}
        ariaLabel={ariaLabel}
        noDataMessage={noDataMessage}
        stickyHeader
        dense={false}
      />
    </StyledGridContainer>
  );
};

export default DataGrid;