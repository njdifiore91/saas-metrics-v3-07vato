import { ChartType } from '../types/chart.types';
import type { Chart, ChartOptions } from 'chart.js'; // chart.js v4.4.0

/**
 * Default chart.js options providing consistent styling and behavior across all charts
 */
export const defaultOptions: ChartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: 'bottom',
      align: 'start',
      labels: {
        padding: 20,
        usePointStyle: true,
        font: {
          size: 12,
          family: "'Roboto', sans-serif"
        }
      }
    },
    tooltip: {
      enabled: true,
      mode: 'index',
      intersect: false,
      padding: 12,
      backgroundColor: 'rgba(33, 33, 33, 0.95)',
      titleFont: {
        size: 14,
        weight: 'bold'
      },
      bodyFont: {
        size: 13
      },
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1
    }
  },
  scales: {
    x: {
      grid: {
        display: false,
        drawBorder: false
      },
      ticks: {
        maxRotation: 45,
        autoSkip: true,
        font: {
          size: 12
        }
      }
    },
    y: {
      beginAtZero: true,
      grid: {
        drawBorder: false,
        color: 'rgba(0, 0, 0, 0.1)'
      },
      ticks: {
        font: {
          size: 12
        }
      }
    }
  },
  animation: {
    duration: 750,
    easing: 'easeInOutQuart'
  }
};

/**
 * Theme-based color palette for consistent chart styling with light/dark mode support
 */
export const colors = {
  light: {
    primary: {
      base: '#1976d2',
      variants: ['#2196f3', '#64b5f6', '#90caf9', '#bbdefb'],
      gradient: ['rgba(25,118,210,1)', 'rgba(25,118,210,0.1)']
    },
    success: {
      base: '#2e7d32',
      variants: ['#4caf50', '#81c784', '#a5d6a7', '#c8e6c9'],
      gradient: ['rgba(46,125,50,1)', 'rgba(46,125,50,0.1)']
    },
    warning: {
      base: '#f57c00',
      variants: ['#ff9800', '#ffb74d', '#ffd54f', '#ffe0b2'],
      gradient: ['rgba(245,124,0,1)', 'rgba(245,124,0,0.1)']
    },
    error: {
      base: '#d32f2f',
      variants: ['#f44336', '#e57373', '#ef9a9a', '#ffcdd2'],
      gradient: ['rgba(211,47,47,1)', 'rgba(211,47,47,0.1)']
    },
    neutral: {
      base: '#424242',
      variants: ['#757575', '#9e9e9e', '#bdbdbd', '#e0e0e0'],
      gradient: ['rgba(66,66,66,1)', 'rgba(66,66,66,0.1)']
    }
  },
  dark: {
    primary: {
      base: '#90caf9',
      variants: ['#64b5f6', '#42a5f5', '#2196f3', '#1976d2'],
      gradient: ['rgba(144,202,249,1)', 'rgba(144,202,249,0.1)']
    },
    success: {
      base: '#a5d6a7',
      variants: ['#81c784', '#66bb6a', '#4caf50', '#2e7d32'],
      gradient: ['rgba(165,214,167,1)', 'rgba(165,214,167,0.1)']
    },
    warning: {
      base: '#ffb74d',
      variants: ['#ffa726', '#ff9800', '#f57c00', '#e65100'],
      gradient: ['rgba(255,183,77,1)', 'rgba(255,183,77,0.1)']
    },
    error: {
      base: '#ef9a9a',
      variants: ['#e57373', '#f44336', '#d32f2f', '#b71c1c'],
      gradient: ['rgba(239,154,154,1)', 'rgba(239,154,154,0.1)']
    },
    neutral: {
      base: '#e0e0e0',
      variants: ['#bdbdbd', '#9e9e9e', '#757575', '#424242'],
      gradient: ['rgba(224,224,224,1)', 'rgba(224,224,224,0.1)']
    }
  }
};

/**
 * Standard chart dimensions and responsive breakpoints
 */
export const dimensions = {
  minWidth: 300,
  minHeight: 200,
  aspectRatio: 1.6,
  padding: {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40
  },
  breakpoints: {
    sm: 320,
    md: 768,
    lg: 1024,
    xl: 1440
  }
};

/**
 * Chart type specific configurations
 */
export const chartTypeConfig = {
  [ChartType.LINE]: {
    tension: 0.4,
    pointRadius: 4,
    pointHoverRadius: 6
  },
  [ChartType.BAR]: {
    barPercentage: 0.8,
    categoryPercentage: 0.9
  },
  [ChartType.AREA]: {
    fill: true,
    tension: 0.4
  },
  [ChartType.PIE]: {
    cutout: '0%',
    radius: '90%'
  },
  [ChartType.SCATTER]: {
    pointRadius: 6,
    pointHoverRadius: 8
  }
};

/**
 * Export consolidated chart configuration
 */
export const chartConfig = {
  defaultOptions,
  colors,
  dimensions,
  chartTypeConfig
};

export default chartConfig;