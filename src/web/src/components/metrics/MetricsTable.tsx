import React, { useMemo } from 'react';
import { Table } from '../common/Table';
import { CompanyMetric } from '../../types/metric.types';
import { formatMetricValue, formatDate } from '../../utils/format.utils';
import { TableColumn } from '../common/Table';
import { Tooltip, Typography } from '@mui/material'; // @mui/material v5.14.0

interface MetricsTableProps {
  metrics: CompanyMetric[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
}

/**
 * A specialized table component for displaying company metrics data with comprehensive
 * accessibility support and proper metric value formatting.
 */
const MetricsTable: React.FC<MetricsTableProps> = ({
  metrics,
  loading,
  page,
  pageSize,
  total,
  onPageChange,
  onSort,
}) => {
  /**
   * Generates table column configurations with proper formatting and accessibility support
   */
  const columns = useMemo<TableColumn[]>(() => [
    {
      id: 'name',
      label: 'Metric Name',
      sortable: true,
      align: 'left',
      minWidth: 200,
      ariaLabel: 'Sort by metric name',
      tooltipText: 'Click to sort by metric name'
    },
    {
      id: 'category',
      label: 'Category',
      sortable: true,
      align: 'left',
      minWidth: 150,
      ariaLabel: 'Sort by category',
      tooltipText: 'Click to sort by category'
    },
    {
      id: 'value',
      label: 'Value',
      sortable: true,
      align: 'right',
      minWidth: 150,
      format: (value: number, row: CompanyMetric) => (
        <Tooltip 
          title={`Raw value: ${value}`}
          aria-label={`Metric value: ${value}`}
        >
          <Typography component="span">
            {formatMetricValue(value, row.metricId)}
          </Typography>
        </Tooltip>
      ),
      ariaLabel: 'Sort by value',
      tooltipText: 'Click to sort by value'
    },
    {
      id: 'periodStart',
      label: 'Period Start',
      sortable: true,
      align: 'left',
      minWidth: 120,
      format: (value: Date) => (
        <Typography component="span" aria-label={`Period start: ${formatDate(value)}`}>
          {formatDate(value)}
        </Typography>
      ),
      ariaLabel: 'Sort by period start date',
      tooltipText: 'Click to sort by start date'
    },
    {
      id: 'periodEnd',
      label: 'Period End',
      sortable: true,
      align: 'left',
      minWidth: 120,
      format: (value: Date) => (
        <Typography component="span" aria-label={`Period end: ${formatDate(value)}`}>
          {formatDate(value)}
        </Typography>
      ),
      ariaLabel: 'Sort by period end date',
      tooltipText: 'Click to sort by end date'
    },
    {
      id: 'createdAt',
      label: 'Created',
      sortable: true,
      align: 'left',
      minWidth: 120,
      format: (value: Date) => (
        <Typography component="span" aria-label={`Created at: ${formatDate(value)}`}>
          {formatDate(value)}
        </Typography>
      ),
      ariaLabel: 'Sort by creation date',
      tooltipText: 'Click to sort by creation date'
    }
  ], []);

  return (
    <Table
      columns={columns}
      data={metrics}
      loading={loading}
      page={page}
      pageSize={pageSize}
      total={total}
      onPageChange={onPageChange}
      onSort={onSort}
      ariaLabel="Company metrics table"
      stickyHeader
      dense
    />
  );
};

export default MetricsTable;