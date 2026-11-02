const SQL_MACRO_PATTERN = /\$__([a-zA-Z0-9_]+)(?:\(([^)]*)\))?/g;

type MacroArity = { min: number; hint: string };

// Postgres / MySQL / MSSQL share these $__ macros. Missing required args used to
// be rewritten to macro_error() and then dropped by some query paths.
const SQL_MACRO_ARITY: Record<string, MacroArity> = {
  time: { min: 1, hint: 'time column' },
  timeEpoch: { min: 1, hint: 'time column' },
  timeFilter: { min: 1, hint: 'time column' },
  unixEpochFilter: { min: 1, hint: 'time column' },
  unixEpochNanoFilter: { min: 1, hint: 'time column' },
  timeGroup: { min: 2, hint: 'time column and interval' },
  timeGroupAlias: { min: 2, hint: 'time column and interval' },
  unixEpochGroup: { min: 2, hint: 'time column and interval' },
  unixEpochGroupAlias: { min: 2, hint: 'time column and interval' },
};

export function getSqlMacroError(rawSql?: string): string | undefined {
  if (!rawSql) {
    return undefined;
  }

  if (rawSql.includes('macro_error()')) {
    return 'SQL macro interpolation failed';
  }

  SQL_MACRO_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SQL_MACRO_PATTERN.exec(rawSql)) !== null) {
    const name = match[1];
    const spec = SQL_MACRO_ARITY[name];
    if (!spec) {
      continue;
    }

    const rawArgs = match[2];
    const args =
      rawArgs === undefined
        ? []
        : rawArgs
            .split(',')
            .map((arg) => arg.trim())
            .filter((arg) => arg.length > 0);

    if (args.length < spec.min) {
      return `macro $__${name} needs ${spec.hint}`;
    }
  }

  return undefined;
}
