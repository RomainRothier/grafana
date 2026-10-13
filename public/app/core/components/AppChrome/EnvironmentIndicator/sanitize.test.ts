import { sanitizeEnvironmentIndicatorColor, sanitizeEnvironmentIndicatorName } from './sanitize';

describe('sanitizeEnvironmentIndicatorName', () => {
  it('returns an empty string when the name is missing or blank', () => {
    expect(sanitizeEnvironmentIndicatorName(undefined)).toBe('');
    expect(sanitizeEnvironmentIndicatorName('   ')).toBe('');
  });

  it('keeps markup characters so they can be rendered as text', () => {
    expect(sanitizeEnvironmentIndicatorName(' <img src=x onerror=alert(1)> ')).toBe('<img src=x onerror=alert(1)>');
  });

  it('strips control characters and caps the label at 64 characters', () => {
    expect(sanitizeEnvironmentIndicatorName('Stage\nstaging\t')).toBe('Stagestaging');
    expect(sanitizeEnvironmentIndicatorName('é'.repeat(80))).toBe('é'.repeat(64));
  });
});

describe('sanitizeEnvironmentIndicatorColor', () => {
  it('accepts hex colors and normalizes them', () => {
    expect(sanitizeEnvironmentIndicatorColor('  #FF8800 ')).toBe('#ff8800');
    expect(sanitizeEnvironmentIndicatorColor('#AbC')).toBe('#abc');
  });

  it('maps the allowed color names to hex', () => {
    expect(sanitizeEnvironmentIndicatorColor('Red')).toBe('#ff0000');
    expect(sanitizeEnvironmentIndicatorColor('amber')).toBe('#ffbf00');
    expect(sanitizeEnvironmentIndicatorColor('grey')).toBe('#808080');
  });

  it('rejects values that are not hex or an allowed name', () => {
    expect(sanitizeEnvironmentIndicatorColor('')).toBe('');
    expect(sanitizeEnvironmentIndicatorColor('red;background:url(https://evil.test)')).toBe('');
    expect(sanitizeEnvironmentIndicatorColor('expression(alert(1))')).toBe('');
    expect(sanitizeEnvironmentIndicatorColor('rgb(255,0,0)')).toBe('');
    expect(sanitizeEnvironmentIndicatorColor('#ff0000;')).toBe('');
    expect(sanitizeEnvironmentIndicatorColor('#ff00')).toBe('');
    expect(sanitizeEnvironmentIndicatorColor('javascript:alert(1)')).toBe('');
  });
});
