import { render, screen } from 'test/test-utils';

import { type GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';

import { EnvironmentIndicator } from './EnvironmentIndicator';
import { environmentIndicatorHeight, resolveEnvironmentIndicatorColors } from './environmentIndicator';

const indicator = () => screen.queryByTestId(selectors.components.EnvironmentIndicator.container);

describe('environmentIndicatorHeight', () => {
  it('is zero when the label is unset', () => {
    expect(environmentIndicatorHeight(undefined)).toBe(0);
    expect(environmentIndicatorHeight('')).toBe(0);
    expect(environmentIndicatorHeight('   ')).toBe(0);
  });

  it('is 28px when a label is set', () => {
    expect(environmentIndicatorHeight('staging')).toBe(28);
  });
});

describe('resolveEnvironmentIndicatorColors', () => {
  const theme = {
    colors: {
      warning: { main: '#ff9900', contrastText: '#000000' },
      error: { main: '#d10e5c', contrastText: '#ffffff' },
      info: { main: '#3d71d9', contrastText: '#ffffff' },
      success: { main: '#1a7f4b', contrastText: '#ffffff' },
      tertiary: { main: '#C27AFF', contrastText: '#000000' },
      getContrastText: (background: string) => (background.toLowerCase() === '#ffffff' ? '#000000' : '#ffffff'),
    },
  } as unknown as GrafanaTheme2;

  it('uses the warning color when the color is unset or invalid', () => {
    expect(resolveEnvironmentIndicatorColors('', theme)).toEqual({ background: '#ff9900', text: '#000000' });
    expect(resolveEnvironmentIndicatorColors('expression(alert(1))', theme)).toEqual({
      background: '#ff9900',
      text: '#000000',
    });
  });

  it('maps a named color onto its theme token', () => {
    expect(resolveEnvironmentIndicatorColors('red', theme)).toEqual({ background: '#d10e5c', text: '#ffffff' });
    expect(resolveEnvironmentIndicatorColors('Purple', theme)).toEqual({ background: '#C27AFF', text: '#000000' });
  });

  it('uses a hex color and a contrasting text color', () => {
    expect(resolveEnvironmentIndicatorColors('#111827', theme)).toEqual({ background: '#111827', text: '#ffffff' });
    expect(resolveEnvironmentIndicatorColors('#ffffff', theme)).toEqual({ background: '#ffffff', text: '#000000' });
  });
});

describe('EnvironmentIndicator', () => {
  const originalLabel = config.environmentIndicatorLabel;
  const originalColor = config.environmentIndicatorColor;

  afterEach(() => {
    config.environmentIndicatorLabel = originalLabel;
    config.environmentIndicatorColor = originalColor;
  });

  it('renders nothing when the label is unset', () => {
    config.environmentIndicatorLabel = '';
    config.environmentIndicatorColor = '#ff0000';

    render(<EnvironmentIndicator />);

    expect(indicator()).not.toBeInTheDocument();
  });

  it('renders nothing when the label is only whitespace', () => {
    config.environmentIndicatorLabel = '   ';

    render(<EnvironmentIndicator />);

    expect(indicator()).not.toBeInTheDocument();
  });

  it('shows the label on the default warning color when no color is set', () => {
    config.environmentIndicatorLabel = 'staging';
    config.environmentIndicatorColor = '';

    render(<EnvironmentIndicator />);

    const banner = indicator();
    expect(banner).toHaveTextContent('staging');
    expect(banner).toHaveAccessibleName('Environment: staging');
    expect(banner).toHaveStyle({ backgroundColor: '#ff9900' });
  });

  it('uses a configured hex color', () => {
    config.environmentIndicatorLabel = 'production';
    config.environmentIndicatorColor = '#111827';

    render(<EnvironmentIndicator />);

    expect(indicator()).toHaveTextContent('production');
    expect(indicator()).toHaveStyle({ backgroundColor: '#111827', color: '#ffffff' });
  });

  it('falls back to the warning color when the configured color is invalid', () => {
    config.environmentIndicatorLabel = 'dev';
    config.environmentIndicatorColor = 'url(https://example.com)';

    render(<EnvironmentIndicator />);

    expect(indicator()).toHaveTextContent('dev');
    expect(indicator()).toHaveStyle({ backgroundColor: '#ff9900' });
  });
});
