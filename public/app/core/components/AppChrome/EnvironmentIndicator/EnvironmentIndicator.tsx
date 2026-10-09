import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';
import { t } from '@grafana/i18n';
import { config } from '@grafana/runtime';
import { useStyles2, useTheme2 } from '@grafana/ui';

import {
  ENVIRONMENT_INDICATOR_HEIGHT,
  normalizeEnvironmentIndicatorLabel,
  resolveEnvironmentIndicatorColors,
} from './environmentIndicator';

const getStyles = (theme: GrafanaTheme2) => ({
  banner: css({
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    height: ENVIRONMENT_INDICATOR_HEIGHT,
    justifyContent: 'center',
    left: 0,
    letterSpacing: '0.04em',
    overflow: 'hidden',
    padding: theme.spacing(0, 1),
    position: 'fixed',
    right: 0,
    textOverflow: 'ellipsis',
    top: 0,
    whiteSpace: 'nowrap',
    zIndex: theme.zIndex.navbarFixed,
  }),
});

export function EnvironmentIndicator() {
  const label = normalizeEnvironmentIndicatorLabel(config.environmentIndicatorLabel);
  const styles = useStyles2(getStyles);
  const theme = useTheme2();

  if (!label) {
    return null;
  }

  const colors = resolveEnvironmentIndicatorColors(config.environmentIndicatorColor, theme);

  return (
    <div
      className={styles.banner}
      style={{ backgroundColor: colors.background, color: colors.text }}
      data-testid={selectors.components.EnvironmentIndicator.container}
      role="region"
      aria-label={t('app-chrome.environment-indicator.aria-label', 'Environment: {{label}}', { label })}
    >
      {label}
    </div>
  );
}
