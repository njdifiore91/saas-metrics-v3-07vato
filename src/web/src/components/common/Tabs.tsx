import React, { useState } from 'react'; // react v18.2.0
import { Tabs, Tab, Box } from '@mui/material'; // @mui/material v5.14.0
import { useTheme } from '../../hooks/useTheme';

interface TabsProps {
  tabs: Array<{
    label: string;
    content: React.ReactNode;
  }>;
  defaultTab?: number;
  onChange?: (newValue: number) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'standard' | 'scrollable' | 'fullWidth';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Generates accessibility properties for tabs and panels
 * @param index - The index of the tab/panel
 * @returns Object containing ARIA and role attributes
 */
const a11yProps = (index: number) => ({
  id: `tab-${index}`,
  'aria-controls': `tabpanel-${index}`,
  role: 'tab',
  tabIndex: 0,
  'aria-selected': false,
});

/**
 * TabPanel component that renders content with proper accessibility attributes
 */
const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  const { theme } = useTheme();

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      style={{
        padding: theme.spacing(3),
        minHeight: '200px',
      }}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
};

/**
 * CustomTabs component providing accessible, themed tab navigation
 * Compliant with WCAG 2.1 Level AA standards
 */
export const CustomTabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab = 0,
  onChange,
  className,
  orientation = 'horizontal',
  variant = 'standard',
}) => {
  const { theme } = useTheme();
  const [value, setValue] = useState(defaultTab);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    onChange?.(newValue);
  };

  return (
    <Box
      sx={{
        width: '100%',
        [theme.breakpoints.down('sm')]: {
          // Mobile-first responsive adjustments
          '& .MuiTabs-root': {
            minHeight: '48px',
          },
          '& .MuiTab-root': {
            minHeight: '48px',
            padding: '6px 12px',
            fontSize: '0.875rem',
          },
        },
      }}
      className={className}
    >
      <Box
        sx={{
          borderBottom: orientation === 'horizontal' ? 1 : 0,
          borderRight: orientation === 'vertical' ? 1 : 0,
          borderColor: 'divider',
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="Navigation tabs"
          orientation={orientation}
          variant={variant}
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
            },
            '& .MuiTab-root.Mui-selected': {
              color: theme.palette.primary.main,
            },
          }}
          // Accessibility enhancements
          role="tablist"
          selectionFollowsFocus
        >
          {tabs.map((tab, index) => (
            <Tab
              key={`tab-${index}`}
              label={tab.label}
              {...a11yProps(index)}
              sx={{
                '&:focus-visible': {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: '2px',
                },
              }}
            />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, index) => (
        <TabPanel key={`panel-${index}`} value={value} index={index}>
          {tab.content}
        </TabPanel>
      ))}
    </Box>
  );
};

export default CustomTabs;