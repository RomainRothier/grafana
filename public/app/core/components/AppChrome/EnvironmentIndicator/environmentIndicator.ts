import { config } from '@grafana/runtime';

/** Fixed height of the banner when a label is configured. */
export const ENVIRONMENT_INDICATOR_HEIGHT = 24;

export const DEFAULT_ENVIRONMENT_INDICATOR_COLOR = '#f5a623';

const TEXT_ON_LIGHT = '#141414';
const TEXT_ON_DARK = '#ffffff';

const NAMED_COLORS: Record<string, string> = {
  red: '#e02f44',
  orange: '#ff9900',
  yellow: '#fade2a',
  green: '#73bf69',
  blue: '#5794f2',
  purple: '#b877d9',
};

// Same allowlist as pkg/setting.SanitizeEnvironmentIndicatorName / Color.
// The color is written into CSS and the label is shown on every page.
const NAME_MAX_RUNES = 64;
const NAME_PATTERN = /^[\p{L}\p{N} .,_/()&+:-]{1,64}$/u;
const LETTER_OR_NUMBER = /[\p{L}\p{N}]/u;
const COLOR_PATTERN = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$|^(?:red|orange|yellow|green|blue|purple)$/;

export interface EnvironmentIndicator {
  name: string;
  backgroundColor: string;
  textColor: string;
}

export function resolveEnvironmentIndicator(
  name: string | undefined,
  color: string | undefined
): EnvironmentIndicator | undefined {
  const trimmed = name?.trim() ?? '';
  if (!isValidIndicatorName(trimmed)) {
    return undefined;
  }

  const backgroundColor = resolveIndicatorColor(color) ?? DEFAULT_ENVIRONMENT_INDICATOR_COLOR;
  return {
    name: trimmed,
    backgroundColor,
    textColor: textColorForBackground(backgroundColor),
  };
}

export function getEnvironmentIndicatorHeight(): number {
  return resolveEnvironmentIndicator(config.environmentIndicatorName, config.environmentIndicatorColor)
    ? ENVIRONMENT_INDICATOR_HEIGHT
    : 0;
}

function isValidIndicatorName(name: string): boolean {
  if (name === '' || [...name].length > NAME_MAX_RUNES) {
    return false;
  }
  return NAME_PATTERN.test(name) && LETTER_OR_NUMBER.test(name);
}

function resolveIndicatorColor(color: string | undefined): string | undefined {
  const normalized = color?.trim().toLowerCase() ?? '';
  if (normalized === '' || !COLOR_PATTERN.test(normalized)) {
    return undefined;
  }
  if (normalized.startsWith('#')) {
    return expandHex(normalized);
  }
  return NAMED_COLORS[normalized];
}

function expandHex(hex: string): string {
  const body = hex.slice(1);
  const rgb =
    body.length === 3
      ? body
          .split('')
          .map((channel) => channel + channel)
          .join('')
      : body;
  return `#${rgb}`;
}

function textColorForBackground(hex: string): string {
  const body = hex.slice(1);
  const red = Number.parseInt(body.slice(0, 2), 16);
  const green = Number.parseInt(body.slice(2, 4), 16);
  const blue = Number.parseInt(body.slice(4, 6), 16);
  const luminance = 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
  const contrastWhite = 1.05 / (luminance + 0.05);
  const contrastDark = (luminance + 0.05) / 0.05;
  return contrastDark >= contrastWhite ? TEXT_ON_LIGHT : TEXT_ON_DARK;
}

function linearize(channel: number): number {
  const s = channel / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
