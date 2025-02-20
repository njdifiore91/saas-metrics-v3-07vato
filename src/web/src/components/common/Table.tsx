import React, { useState, useCallback, useMemo } from 'react';
import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Checkbox,
  Paper,
  Typography,
  Box,
  Tooltip,
  styled,
  useTheme
} from '@mui/material'; // @mui/material v5.14.0
import { visuallyHidden } from '@mui/utils'; // @mui/utils v5.14.0
import Loading from './Loading';
import { PaginatedResponse } from '../../types/api.types';

// Enhanced table column interface with accessibility support
export interface TableColumn {
  id: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => React.ReactNode;
  ariaLabel?: string;
  tooltipText?: string;
  minWidth?: number;
}

// Comprehensive table props with generic type support
export interface TableProps<T> {
  columns: TableColumn[];
  data: T[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  enableSelection?: boolean;
  onSelectionChange?: (selected: T[]) => void;
  ariaLabel?: string;
  noDataMessage?: string;
  getRowId?: (row: T) => string | number;
  stickyHeader?: boolean;
  dense?: boolean;
}

// Styled components for enhanced visual presentation
const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  maxHeight: '100%',
  position: 'relative',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1]
}));

const StyledNoDataContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  color: theme.palette.text.secondary
}));

// Generic table component implementation
export const Table = <T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  page,
  pageSize,
  total,
  onPageChange,
  onSort,
  enableSelection = false,
  onSelectionChange,
  ariaLabel = 'Data table',
  noDataMessage = 'No data available',
  getRowId = (row: T) => row.id,
  stickyHeader = true,
  dense = false
}: TableProps<T>): React.ReactElement => {
  const theme = useTheme();
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<(string | number)[]>([]);

  // Memoized handlers for performance optimization
  const handleSort = useCallback((columnId: string) => {
    const isAsc = sortColumn === columnId && sortDirection === 'asc';
    const newDirection = isAsc ? 'desc' : 'asc';
    setSortColumn(columnId);
    setSortDirection(newDirection);
    onSort?.(columnId, newDirection);
  }, [sortColumn, sortDirection, onSort]);

  const handleSelectAllClick = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = data.map(row => getRowId(row));
      setSelected(newSelected);
      onSelectionChange?.(data);
    } else {
      setSelected([]);
      onSelectionChange?.([]);
    }
  }, [data, getRowId, onSelectionChange]);

  const handleRowSelect = useCallback((id: string | number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: (string | number)[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else {
      newSelected = selected.filter(item => item !== id);
    }

    setSelected(newSelected);
    const selectedRows = data.filter(row => newSelected.includes(getRowId(row)));
    onSelectionChange?.(selectedRows);
  }, [selected, data, getRowId, onSelectionChange]);

  const handlePageChange = useCallback((event: unknown, newPage: number) => {
    onPageChange(newPage, pageSize);
  }, [onPageChange, pageSize]);

  const handleRowsPerPageChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onPageChange(0, parseInt(event.target.value, 10));
  }, [onPageChange]);

  // Memoized derived values
  const isSelected = useCallback((id: string | number) => selected.indexOf(id) !== -1, [selected]);

  // Render table content
  const renderTableContent = () => {
    if (loading) {
      return (
        <StyledNoDataContainer>
          <Loading size="medium" message="Loading data..." />
        </StyledNoDataContainer>
      );
    }

    if (!data.length) {
      return (
        <StyledNoDataContainer>
          <Typography variant="body1">{noDataMessage}</Typography>
        </StyledNoDataContainer>
      );
    }

    return (
      <TableBody>
        {data.map((row, index) => {
          const rowId = getRowId(row);
          const isItemSelected = isSelected(rowId);
          const labelId = `table-checkbox-${index}`;

          return (
            <TableRow
              hover
              role="checkbox"
              aria-checked={isItemSelected}
              tabIndex={-1}
              key={rowId}
              selected={isItemSelected}
              sx={{ cursor: enableSelection ? 'pointer' : 'default' }}
            >
              {enableSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    color="primary"
                    checked={isItemSelected}
                    onChange={() => handleRowSelect(rowId)}
                    inputProps={{
                      'aria-labelledby': labelId,
                    }}
                  />
                </TableCell>
              )}
              {columns.map(column => {
                const value = row[column.id];
                return (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    sx={{ minWidth: column.minWidth }}
                  >
                    {column.format ? column.format(value) : value}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })}
      </TableBody>
    );
  };

  return (
    <StyledTableContainer component={Paper}>
      <MuiTable
        aria-label={ariaLabel}
        stickyHeader={stickyHeader}
        size={dense ? 'small' : 'medium'}
      >
        <TableHead>
          <TableRow>
            {enableSelection && (
              <TableCell padding="checkbox">
                <Checkbox
                  color="primary"
                  indeterminate={selected.length > 0 && selected.length < data.length}
                  checked={data.length > 0 && selected.length === data.length}
                  onChange={handleSelectAllClick}
                  inputProps={{
                    'aria-label': 'select all items',
                  }}
                />
              </TableCell>
            )}
            {columns.map(column => (
              <TableCell
                key={column.id}
                align={column.align}
                sortDirection={sortColumn === column.id ? sortDirection : false}
                sx={{ minWidth: column.minWidth }}
              >
                {column.sortable ? (
                  <Tooltip title={column.tooltipText || ''}>
                    <TableSortLabel
                      active={sortColumn === column.id}
                      direction={sortColumn === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                      aria-label={column.ariaLabel || `Sort by ${column.label}`}
                    >
                      {column.label}
                      {sortColumn === column.id && (
                        <Box component="span" sx={visuallyHidden}>
                          {sortDirection === 'desc' ? 'sorted descending' : 'sorted ascending'}
                        </Box>
                      )}
                    </TableSortLabel>
                  </Tooltip>
                ) : (
                  <Typography variant="subtitle2" component="span">
                    {column.label}
                  </Typography>
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        {renderTableContent()}
      </MuiTable>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={total}
        rowsPerPage={pageSize}
        page={page}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        aria-label="Table pagination"
      />
    </StyledTableContainer>
  );
};

export default Table;