import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import Button from '../../src/components/common/Button';
import { renderWithProviders } from '../../src/utils/test.utils';

describe('Button component', () => {
  // Mock function for click events
  const mockOnClick = jest.fn();

  // Reset mocks before each test
  beforeEach(() => {
    mockOnClick.mockClear();
  });

  it('renders with default props', () => {
    renderWithProviders(<Button>Test Button</Button>);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('MuiButton-contained');
    expect(button).toHaveClass('MuiButton-sizeMedium');
    expect(button).toHaveClass('MuiButton-root');
    expect(button).toHaveTextContent('Test Button');
  });

  it('renders with different variants', () => {
    const { rerender } = renderWithProviders(
      <Button variant="contained">Contained</Button>
    );
    expect(screen.getByRole('button')).toHaveClass('MuiButton-contained');

    rerender(<Button variant="outlined">Outlined</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-outlined');

    rerender(<Button variant="text">Text</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-text');
  });

  it('renders with different sizes', () => {
    const { rerender } = renderWithProviders(
      <Button size="small">Small</Button>
    );
    expect(screen.getByRole('button')).toHaveClass('MuiButton-sizeSmall');

    rerender(<Button size="medium">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-sizeMedium');

    rerender(<Button size="large">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-sizeLarge');
  });

  it('renders with different colors', () => {
    const { rerender } = renderWithProviders(
      <Button color="primary">Primary</Button>
    );
    expect(screen.getByRole('button')).toHaveClass('MuiButton-colorPrimary');

    rerender(<Button color="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-colorSecondary');

    rerender(<Button color="error">Error</Button>);
    expect(screen.getByRole('button')).toHaveClass('MuiButton-colorError');
  });

  it('handles click events', () => {
    renderWithProviders(
      <Button onClick={mockOnClick}>Clickable</Button>
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('handles keyboard interactions', () => {
    renderWithProviders(
      <Button onClick={mockOnClick}>Keyboard Accessible</Button>
    );
    
    const button = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(mockOnClick).toHaveBeenCalledTimes(1);

    // Test Space key
    fireEvent.keyDown(button, { key: ' ' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);

    // Test other keys (should not trigger click)
    fireEvent.keyDown(button, { key: 'A' });
    expect(mockOnClick).toHaveBeenCalledTimes(2);
  });

  it('handles disabled state', () => {
    renderWithProviders(
      <Button disabled onClick={mockOnClick}>Disabled</Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('Mui-disabled');
    
    fireEvent.click(button);
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('renders with fullWidth prop', () => {
    renderWithProviders(
      <Button fullWidth>Full Width</Button>
    );
    expect(screen.getByRole('button')).toHaveClass('MuiButton-fullWidth');
  });

  it('renders with start and end icons', () => {
    const StartIcon = () => <span data-testid="start-icon">Start</span>;
    const EndIcon = () => <span data-testid="end-icon">End</span>;

    renderWithProviders(
      <Button startIcon={<StartIcon />} endIcon={<EndIcon />}>
        With Icons
      </Button>
    );

    expect(screen.getByTestId('start-icon')).toBeInTheDocument();
    expect(screen.getByTestId('end-icon')).toBeInTheDocument();
  });

  it('supports custom aria-label', () => {
    renderWithProviders(
      <Button ariaLabel="Custom Label">Button</Button>
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');
  });

  it('handles custom tabIndex', () => {
    renderWithProviders(
      <Button tabIndex={2}>Custom Tab Index</Button>
    );
    expect(screen.getByRole('button')).toHaveAttribute('tabindex', '2');
  });

  it('renders with different themes', async () => {
    const { rerender } = renderWithProviders(
      <Button>Theme Test</Button>,
      { theme: 'light' }
    );

    let button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: expect.any(String) });

    rerender(<Button>Theme Test</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveStyle({ backgroundColor: expect.any(String) });
  });

  it('passes accessibility checks', async () => {
    const { axe } = renderWithProviders(
      <Button>Accessibility Test</Button>
    );
    
    const results = await axe();
    expect(results).toHaveNoViolations();
  });
});