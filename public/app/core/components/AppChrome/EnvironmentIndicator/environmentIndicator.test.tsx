import { render, screen } from '@testing-library/react';

import { EnvironmentIndicator } from './EnvironmentIndicator';
import { resolveEnvironmentIndicator } from './environmentIndicator';

describe('resolveEnvironmentIndicator', () => {
  it('returns nothing when the label is unset', () => {
    expect(resolveEnvironmentIndicator(undefined, '#112233')).toBeUndefined();
    expect(resolveEnvironmentIndicator('', '#112233')).toBeUndefined();
    expect(resolveEnvironmentIndicator('   ', undefined)).toBeUndefined();
  });

  it('returns the trimmed label and default amber bar when no color is set', () => {
    expect(resolveEnvironmentIndicator('  staging  ', undefined)).toEqual({
      name: 'staging',
      backgroundColor: '#f5a623',
      textColor: '#141414',
    });
  });

  it('uses a hex color and picks white text on a dark bar', () => {
    expect(resolveEnvironmentIndicator('production', '#112233')).toEqual({
      name: 'production',
      backgroundColor: '#112233',
      textColor: '#ffffff',
    });
  });

  it('expands a short hex color and maps a named color', () => {
    expect(resolveEnvironmentIndicator('dev', '#abc')?.backgroundColor).toBe('#aabbcc');
    expect(resolveEnvironmentIndicator('dev', 'Red')).toEqual({
      name: 'dev',
      backgroundColor: '#e02f44',
      textColor: '#141414',
    });
  });

  it('ignores a color that is not a single hex or named color', () => {
    expect(resolveEnvironmentIndicator('staging', 'red;background:url(https://evil.test)')).toEqual({
      name: 'staging',
      backgroundColor: '#f5a623',
      textColor: '#141414',
    });
  });

  it('rejects a label that is not plain text', () => {
    expect(resolveEnvironmentIndicator('<img src=x onerror=alert(1)>', '#112233')).toBeUndefined();
    expect(resolveEnvironmentIndicator(`dev\nstaging`, '#112233')).toBeUndefined();
    expect(resolveEnvironmentIndicator('a'.repeat(65), '#112233')).toBeUndefined();
  });
});

describe('EnvironmentIndicator', () => {
  it('shows the configured label', () => {
    render(<EnvironmentIndicator indicator={{ name: 'staging', backgroundColor: '#112233', textColor: '#ffffff' }} />);

    const banner = screen.getByRole('status', { name: 'Environment: staging' });
    expect(banner).toHaveTextContent('staging');
    expect(banner).toHaveStyle({ backgroundColor: '#112233', color: '#ffffff' });
  });
});
