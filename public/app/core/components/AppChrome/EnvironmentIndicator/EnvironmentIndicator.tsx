import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { config } from '@grafana/runtime';
import { useStyles2, useTheme2 } from '@grafana/ui';

import { sanitizeEnvironmentIndicatorColor, sanitizeEnvironmentIndicatorName } from './sanitize';

export const ENVIRONMENT_INDICATOR_OVERLAY_HEIGHT = 28;

export type EnvironmentIndicatorVariant = 'inline' | 'overlay';

export function hasEnvironmentIndicator(): boolean {
  return sanitizeEnvironmentIndicatorName(config.environmentIndicator?.name) !== '';
}

export function EnvironmentIndicator({ variant }: { variant: EnvironmentIndicatorVariant }) {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const name = sanitizeEnvironmentIndicatorName(config.environmentIndicator?.name);
  if (!name) {
    return null;
  }

  // Only a sanitized hex value is written into the style. An empty result falls
  // back to the theme warning color, which is not taken from configuration.
  const configuredColor = sanitizeEnvironmentIndicatorColor(config.environmentIndicator?.color);
  const backgroundColor = configuredColor || theme.colors.warning.main;
  const textColor = theme.colors.getContrastText(backgroundColor);

  return (
    <div
      className={variant === 'overlay' ? styles.overlay : styles.inline}
      style={{ backgroundColor, color: textColor }}
      role="status"
      data-testid={selectors.components.NavBar.EnvironmentIndicator.container}
    >
      {name}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  inline: css({
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    maxWidth: theme.spacing(32),
    height: theme.spacing(3),
    padding: theme.spacing(0, 1),
    borderRadius: theme.shape.radius.default,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  overlay: css({
    position: 'fixed',
    zIndex: theme.zIndex.navbarFixed,
    top: 0,
    left: 0,
    right: 0,
    height: ENVIRONMENT_INDICATOR_OVERLAY_HEIGHT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(0, 1),
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
});
