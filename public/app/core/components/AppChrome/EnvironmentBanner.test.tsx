import { render, screen } from 'test/test-utils';

import { colorManipulator } from '@grafana/data';
import { config } from '@grafana/runtime';

import { ENVIRONMENT_BANNER_COLORS, EnvironmentBanner, getEnvironmentBannerHeight } from './EnvironmentBanner';

describe('EnvironmentBanner', () => {
  const originalLabel = config.environmentBannerLabel;
  const originalColor = config.environmentBannerColor;

  afterEach(() => {
    config.environmentBannerLabel = originalLabel;
    config.environmentBannerColor = originalColor;
  });

  it('renders nothing and takes no space when no label is configured', () => {
    config.environmentBannerLabel = undefined;
    const { container } = render(<EnvironmentBanner />);

    expect(container).toBeEmptyDOMElement();
    expect(getEnvironmentBannerHeight()).toBe(0);
  });

  it('renders the configured label in the configured colour', () => {
    config.environmentBannerLabel = 'STAGING';
    config.environmentBannerColor = 'blue';
    render(<EnvironmentBanner />);

    const banner = screen.getByTestId('environment-banner');
    expect(banner).toHaveTextContent('STAGING');
    expect(banner).toHaveStyle({ backgroundColor: '#1F60C4', color: '#FFFFFF' });
    expect(getEnvironmentBannerHeight()).toBeGreaterThan(0);
  });

  it('falls back to red for colours outside the allowlist instead of using them as CSS', () => {
    config.environmentBannerLabel = 'PROD';
    config.environmentBannerColor = 'url(javascript:alert(1))';
    render(<EnvironmentBanner />);

    expect(screen.getByTestId('environment-banner')).toHaveStyle({ backgroundColor: '#C4162A' });
  });

  it.each(Object.entries(ENVIRONMENT_BANNER_COLORS))('%s meets WCAG AA text contrast', (_, { background, text }) => {
    expect(colorManipulator.getContrastRatio(text, background)).toBeGreaterThanOrEqual(4.5);
  });
});
