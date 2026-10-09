import { getSqlMacroError } from './sqlMacros';

describe('getSqlMacroError', () => {
  it('returns undefined for empty SQL', () => {
    expect(getSqlMacroError(undefined)).toBeUndefined();
    expect(getSqlMacroError('')).toBeUndefined();
  });

  it('returns undefined when required macro arguments are present', () => {
    expect(getSqlMacroError('SELECT * FROM t WHERE $__timeFilter(created_at)')).toBeUndefined();
    expect(getSqlMacroError("SELECT $__timeGroup(created_at, '5m') FROM t")).toBeUndefined();
    expect(getSqlMacroError('SELECT $__timeGroup(created_at, $__interval) FROM t')).toBeUndefined();
    expect(getSqlMacroError('SELECT $__time(created_at), value FROM t')).toBeUndefined();
    expect(getSqlMacroError('SELECT $__timeFrom(), $__timeTo() FROM t')).toBeUndefined();
  });

  it('returns an error when $__timeFilter is missing its time column', () => {
    expect(getSqlMacroError('SELECT * FROM t WHERE $__timeFilter()')).toBe('macro $__timeFilter needs time column');
    expect(getSqlMacroError('SELECT * FROM t WHERE $__timeFilter')).toBe('macro $__timeFilter needs time column');
  });

  it('returns an error when $__timeGroup is missing interval', () => {
    expect(getSqlMacroError('SELECT $__timeGroup(created_at) FROM t')).toBe(
      'macro $__timeGroup needs time column and interval'
    );
    expect(getSqlMacroError('SELECT $__timeGroup() FROM t')).toBe('macro $__timeGroup needs time column and interval');
  });

  it('returns an error when $__time is missing its column', () => {
    expect(getSqlMacroError('SELECT $__time() FROM t')).toBe('macro $__time needs time column');
  });

  it('surfaces leftover macro_error() placeholders instead of ignoring them', () => {
    expect(getSqlMacroError('SELECT macro_error() FROM t')).toBe('SQL macro interpolation failed');
  });

  it('ignores unknown $__ macros so datasource-specific ones still pass', () => {
    expect(getSqlMacroError('SELECT $__interval, $__unixEpochFrom() FROM t')).toBeUndefined();
  });
});
