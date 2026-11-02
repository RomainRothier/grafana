import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { config } from '@grafana/runtime';
import { useStyles2 } from '@grafana/ui';

export const ENVIRONMENT_BANNER_HEIGHT = 24;

// Fixed pairs (not theme tokens) so an environment looks the same in every theme; each pair
// meets WCAG AA contrast. Keys must match the allowlist in pkg/setting.
export const ENVIRONMENT_BANNER_COLORS: Record<string, { background: string; text: string }> = {
  red: { background: '#C4162A', text: '#FFFFFF' },
  orange: { background: '#FF9830', text: '#000000' },
  yellow: { background: '#FADE2A', text: '#000000' },
  green: { background: '#1A7F37', text: '#FFFFFF' },
  blue: { background: '#1F60C4', text: '#FFFFFF' },
  purple: { background: '#8F3BB8', text: '#FFFFFF' },
};

export function getEnvironmentBannerHeight() {
  return config.environmentBannerLabel ? ENVIRONMENT_BANNER_HEIGHT : 0;
}

export function EnvironmentBanner() {
  const label = config.environmentBannerLabel;
  const colors = ENVIRONMENT_BANNER_COLORS[config.environmentBannerColor ?? ''] ?? ENVIRONMENT_BANNER_COLORS.red;
  const styles = useStyles2(getStyles, colors.background, colors.text);

  if (!label) {
    return null;
  }

  return (
    <div className={styles.banner} data-testid="environment-banner" title={label}>
      {label}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2, background: string, text: string) => ({
  banner: css({
    height: ENVIRONMENT_BANNER_HEIGHT,
    lineHeight: `${ENVIRONMENT_BANNER_HEIGHT}px`,
    flexShrink: 0,
    padding: theme.spacing(0, 1),
    background,
    color: text,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightBold,
    letterSpacing: '0.05em',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
});
