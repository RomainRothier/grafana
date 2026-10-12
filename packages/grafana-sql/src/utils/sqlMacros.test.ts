import { LoadingState } from '@grafana/data';

import { getSqlMacroError, surfaceSqlMacroError } from './sqlMacros';

describe('getSqlMacroError', () => {
  it('returns undefined for empty SQL', () => {
    expect(getSqlMacroError(undefined)).toBeUndefined();
    expect(getSqlMacroError('')).toBeUndefined();
  });

  it('returns undefined when required macro arguments are present', () => {
    expect(getSqlMacroError('SELECT * FROM t WHERE $__timeFilter(created_at)')).toBeUndefined();
    expect(getSqlMacroError("SELECT $__timeGroup(created_at, '5m') FROM t")).toBeUndefined();
    expect(getSqlMacroError('SELECT $__timeGroup(created_at, $__interval) FROM t')).toBeUndefined();
    expect(getSqlMacroError("SELECT $__timeGroupAlias(created_at, '$summarize', NULL) FROM t")).toBeUndefined();
    expect(getSqlMacroError('SELECT $__time(created_at), value FROM t')).toBeUndefined();
    expect(getSqlMacroError('SELECT $__timeFrom(), $__timeTo() FROM t')).toBeUndefined();
    expect(getSqlMacroError('SELECT $__unixEpochFrom(), $__unixEpochTo() FROM t')).toBeUndefined();
  });

  it('returns an error when $__timeFilter is missing its time column', () => {
    expect(getSqlMacroError('SELECT * FROM t WHERE $__timeFilter()')).toBe(
      'missing time column argument for macro $__timeFilter'
    );
  });

  it('returns an error when $__timeGroup is missing its interval', () => {
    expect(getSqlMacroError('SELECT $__timeGroup(created_at) FROM t')).toBe(
      'macro $__timeGroup needs time column and interval'
    );
    expect(getSqlMacroError('SELECT $__timeGroup() FROM t')).toBe('macro $__timeGroup needs time column and interval');
  });

  it('returns an error when $__time is missing its column', () => {
    expect(getSqlMacroError('SELECT $__time() FROM t')).toBe('missing time column argument for macro $__time');
  });

  it('surfaces leftover macro_error() placeholders instead of ignoring them', () => {
    expect(getSqlMacroError('SELECT macro_error() FROM t')).toBe('SQL macro interpolation failed');
    expect(getSqlMacroError(`SELECT macro_error('missing time column') FROM t`)).toBe(
      'SQL macro interpolation failed: missing time column'
    );
  });

  it('ignores unknown $__ macros so datasource-specific ones still pass', () => {
    expect(getSqlMacroError('SELECT $__interval, $__customMacro() FROM t')).toBeUndefined();
  });
});

describe('surfaceSqlMacroError', () => {
  it('puts a macro_error() from the executed query on the query response', () => {
    const response = surfaceSqlMacroError({
      data: [
        {
          refId: 'A',
          fields: [],
          length: 0,
          meta: { executedQueryString: 'SELECT macro_error() FROM t' },
        },
      ],
    });

    expect(response.state).toBe(LoadingState.Error);
    expect(response.error).toEqual({ message: 'SQL macro interpolation failed', refId: 'A' });
    expect(response.data[0].meta?.executedQueryString).toBe('SELECT macro_error() FROM t');
  });

  it('leaves a valid executed query response unchanged', () => {
    const response = {
      data: [
        {
          refId: 'A',
          fields: [],
          length: 0,
          meta: { executedQueryString: 'SELECT created_at FROM t WHERE created_at BETWEEN 1 AND 2' },
        },
      ],
    };

    expect(surfaceSqlMacroError(response)).toBe(response);
  });

  it('keeps an error the backend already returned', () => {
    const response = {
      data: [],
      state: LoadingState.Error,
      error: { message: 'interpolation failed: missing time column argument for macro __timeFilter' },
    };

    expect(surfaceSqlMacroError(response)).toBe(response);
  });
});
