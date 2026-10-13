import { render, screen } from 'test/test-utils';

import { selectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';

import { EnvironmentIndicator } from './EnvironmentIndicator';

const indicator = selectors.components.NavBar.EnvironmentIndicator.container;

describe('EnvironmentIndicator', () => {
  const original = config.environmentIndicator;

  afterEach(() => {
    config.environmentIndicator = original;
  });

  it('renders nothing when no environment name is configured', () => {
    config.environmentIndicator = { name: '', color: '#ff0000' };
    const { container } = render(<EnvironmentIndicator variant="inline" />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId(indicator)).not.toBeInTheDocument();
  });

  it('renders nothing when the configured name is only whitespace', () => {
    config.environmentIndicator = { name: '   \n', color: 'red' };
    const { container } = render(<EnvironmentIndicator variant="inline" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the configured name as text and applies a sanitized hex color', () => {
    config.environmentIndicator = { name: 'Staging', color: '#FF8800' };
    render(<EnvironmentIndicator variant="inline" />);

    const banner = screen.getByRole('status');
    expect(banner).toHaveTextContent('Staging');
    expect(banner).toHaveStyle({ backgroundColor: '#ff8800' });
  });

  it('renders markup in the name as text', () => {
    config.environmentIndicator = { name: '<img src=x onerror=alert(1)>', color: 'red' };
    render(<EnvironmentIndicator variant="overlay" />);

    const banner = screen.getByTestId(indicator);
    expect(banner).toHaveTextContent('<img src=x onerror=alert(1)>');
    expect(banner.querySelector('img')).toBeNull();
    expect(banner.innerHTML).not.toContain('<img');
    expect(banner).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('does not pass an unsafe color through to CSS', () => {
    config.environmentIndicator = {
      name: 'Production',
      color: 'red;background:url(https://evil.test)',
    };
    render(<EnvironmentIndicator variant="inline" />);

    const banner = screen.getByRole('status');
    const style = banner.getAttribute('style') ?? '';
    expect(banner).toHaveTextContent('Production');
    expect(style).not.toContain('evil');
    expect(style).not.toContain('url(');
    expect(style).not.toContain('expression');
    expect(style).toMatch(/background-color:/);
  });
});
