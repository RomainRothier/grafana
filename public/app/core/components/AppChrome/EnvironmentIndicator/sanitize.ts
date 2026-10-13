const MAX_ENVIRONMENT_INDICATOR_NAME_LENGTH = 64;

// Named colors accepted for the environment banner. Values are hex so a name
// never reaches CSS. Keep this list aligned with environmentIndicatorNamedColors
// in pkg/setting/setting_environment.go.
const NAMED_ENVIRONMENT_COLORS: Record<string, string> = {
  red: '#ff0000',
  orange: '#ffa500',
  amber: '#ffbf00',
  yellow: '#ffff00',
  green: '#008000',
  blue: '#0000ff',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  black: '#000000',
  white: '#ffffff',
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function sanitizeEnvironmentIndicatorName(raw: string | undefined): string {
  const stripped = (raw ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return Array.from(stripped).slice(0, MAX_ENVIRONMENT_INDICATOR_NAME_LENGTH).join('').trim();
}

export function sanitizeEnvironmentIndicatorColor(raw: string | undefined): string {
  const color = (raw ?? '').trim();
  if (!color) {
    return '';
  }
  if (HEX_COLOR.test(color)) {
    return color.toLowerCase();
  }
  return NAMED_ENVIRONMENT_COLORS[color.toLowerCase()] ?? '';
}
