import { css } from '@emotion/css';

import { type GrafanaTheme2 } from '@grafana/data';
import { t } from '@grafana/i18n';
import { useStyles2 } from '@grafana/ui';

import {
  type EnvironmentIndicator as EnvironmentIndicatorModel,
  ENVIRONMENT_INDICATOR_HEIGHT,
} from './environmentIndicator';

export const ENVIRONMENT_INDICATOR_TEST_ID = 'environment-indicator';

const SAFE_COLOR = /^#[0-9a-f]{6}$/;

interface Props {
  indicator: EnvironmentIndicatorModel;
}

export function EnvironmentIndicator({ indicator }: Props) {
  // Validate before the values reach CSS. Hooks still run, so only the checked colors are passed in.
  const backgroundColor = SAFE_COLOR.test(indicator.backgroundColor) ? indicator.backgroundColor : '#f5a623';
  const textColor = SAFE_COLOR.test(indicator.textColor) ? indicator.textColor : '#141414';
  const styles = useStyles2(getStyles, backgroundColor, textColor);
  if (backgroundColor !== indicator.backgroundColor || textColor !== indicator.textColor) {
    return null;
  }

  return (
    <div
      className={styles.banner}
      data-testid={ENVIRONMENT_INDICATOR_TEST_ID}
      role="status"
      aria-label={t('app-chrome.environment-indicator.label', 'Environment: {{name}}', { name: indicator.name })}
    >
      {indicator.name}
    </div>
  );
}

const getStyles = (theme: GrafanaTheme2, backgroundColor: string, textColor: string) => ({
  banner: css({
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    height: ENVIRONMENT_INDICATOR_HEIGHT,
    zIndex: theme.zIndex.navbarFixed + 1,
    backgroundColor,
    color: textColor,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: `${ENVIRONMENT_INDICATOR_HEIGHT}px`,
    textAlign: 'center',
    padding: `0 ${theme.spacing(2)}`,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
});
