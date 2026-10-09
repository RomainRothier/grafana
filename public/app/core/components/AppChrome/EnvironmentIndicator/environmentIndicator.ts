import { type GrafanaTheme2 } from '@grafana/data';

export const ENVIRONMENT_INDICATOR_HEIGHT = 28;

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

// Names accepted by pkg/setting/environment_indicator.go. Unknown values fall back to the warning color.
function namedIndicatorToken(color: string): 'info' | 'success' | 'warning' | 'error' | 'tertiary' | undefined {
  switch (color) {
    case 'blue':
      return 'info';
    case 'green':
      return 'success';
    case 'orange':
      return 'warning';
    case 'red':
      return 'error';
    case 'purple':
      return 'tertiary';
    default:
      return undefined;
  }
}

export interface EnvironmentIndicatorColors {
  background: string;
  text: string;
}

export function normalizeEnvironmentIndicatorLabel(label: string | undefined | null): string {
  return (label ?? '').trim();
}

/** Zero when the banner is hidden, so chrome offsets stay identical to an unconfigured instance. */
export function environmentIndicatorHeight(label: string | undefined | null): number {
  return normalizeEnvironmentIndicatorLabel(label) ? ENVIRONMENT_INDICATOR_HEIGHT : 0;
}

export function resolveEnvironmentIndicatorColors(
  color: string | undefined | null,
  theme: GrafanaTheme2
): EnvironmentIndicatorColors {
  const value = (color ?? '').trim().toLowerCase();
  const named = namedIndicatorToken(value);
  if (named) {
    const token = theme.colors[named];
    return { background: token.main, text: token.contrastText };
  }
  if (HEX_COLOR.test(value)) {
    return { background: value, text: theme.colors.getContrastText(value) };
  }
  return {
    background: theme.colors.warning.main,
    text: theme.colors.warning.contrastText,
  };
}
