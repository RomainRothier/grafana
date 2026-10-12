import { LoadingState, type DataQueryResponse, type DataQueryResponseData } from '@grafana/data';

// Same call shape as pkg/tsdb/sqlmacro: $name(...). Names keep their leading underscores.
const SQL_MACRO_CALL = /\$([_a-zA-Z0-9]+)\(([^)]*)\)/g;

type MacroArity = { min: number; message: (name: string) => string };

// Shared by MySQL, Postgres, and MSSQL. Missing required args used to be rewritten
// to macro_error() and the panel rendered empty; the text only showed in the inspector.
const SQL_MACRO_ARITY: Record<string, MacroArity> = {
  __time: { min: 1, message: missingTimeColumn },
  __timeEpoch: { min: 1, message: missingTimeColumn },
  __timeFilter: { min: 1, message: missingTimeColumn },
  __unixEpochFilter: { min: 1, message: missingTimeColumn },
  __unixEpochNanoFilter: { min: 1, message: missingTimeColumn },
  __timeGroup: { min: 2, message: missingTimeGroupArgs },
  __timeGroupAlias: { min: 2, message: missingTimeGroupArgs },
  __unixEpochGroup: { min: 2, message: missingTimeGroupArgs },
  __unixEpochGroupAlias: { min: 2, message: missingTimeGroupArgs },
};

function missingTimeColumn(name: string) {
  return `missing time column argument for macro ${name}`;
}

function missingTimeGroupArgs(name: string) {
  return `macro ${name} needs time column and interval`;
}

export function getSqlMacroError(rawSql?: string): string | undefined {
  if (!rawSql) {
    return undefined;
  }

  const placeholder = rawSql.match(/macro_error\(([^)]*)\)/);
  if (placeholder) {
    const detail = placeholder[1]?.trim().replace(/^['"]|['"]$/g, '');
    return detail ? `SQL macro interpolation failed: ${detail}` : 'SQL macro interpolation failed';
  }

  for (const match of rawSql.matchAll(SQL_MACRO_CALL)) {
    const name = match[1];
    const spec = SQL_MACRO_ARITY[name];
    if (!spec) {
      continue;
    }

    const args = match[2]
      .split(',')
      .map((arg) => arg.trim())
      .filter((arg) => arg.length > 0);

    if (args.length < spec.min) {
      return spec.message(`$${name}`);
    }
  }

  return undefined;
}

export function isSqlMacroFailure(message?: string): boolean {
  if (!message) {
    return false;
  }
  return (
    message.includes('SQL macro interpolation failed') ||
    message.includes('macro_error') ||
    /macro \$?__/.test(message) ||
    getSqlMacroError(message) !== undefined
  );
}

function executedQueryString(frame: DataQueryResponseData): string | undefined {
  if (!frame || typeof frame !== 'object' || !('meta' in frame)) {
    return undefined;
  }
  const executed = frame.meta?.executedQueryString;
  return typeof executed === 'string' ? executed : undefined;
}

// Plugins that still substitute macro_error() return an empty frame and no error.
// Lift that into the query response so the panel can show it.
export function surfaceSqlMacroError(response: DataQueryResponse): DataQueryResponse {
  if (response.error) {
    return response;
  }

  for (const frame of response.data ?? []) {
    const macroError = getSqlMacroError(executedQueryString(frame));
    if (!macroError) {
      continue;
    }
    const refId = frame && typeof frame === 'object' && 'refId' in frame ? frame.refId : undefined;
    return {
      ...response,
      state: LoadingState.Error,
      error: { message: macroError, refId: typeof refId === 'string' ? refId : undefined },
    };
  }

  return response;
}
