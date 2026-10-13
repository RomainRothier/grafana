import { firstValueFrom } from 'rxjs';

import { CoreApp, type DataQueryRequest, type DataSourceInstanceSettings } from '@grafana/data';
import { type TemplateSrv } from '@grafana/runtime';

import { type DB, type SQLOptions, type SQLQuery, type SqlQueryModel } from '../types';

import { SqlDatasource } from './SqlDatasource';

class TestSqlDatasource extends SqlDatasource {
  getDB(): DB {
    return {} as DB;
  }

  getQueryModel(): SqlQueryModel {
    return {
      quoteLiteral: (value: string) => `'${value.replace(/'/g, "''")}'`,
    } as SqlQueryModel;
  }
}

describe('SqlDatasource SQL macro errors', () => {
  const instanceSettings = {
    jsonData: {},
  } as unknown as DataSourceInstanceSettings<SQLOptions>;

  const templateSrv = {
    replace: (value?: string) => value ?? '',
    containsTemplate: () => false,
  } as unknown as TemplateSrv;

  let ds: TestSqlDatasource;

  beforeEach(() => {
    ds = new TestSqlDatasource(instanceSettings, templateSrv);
  });

  it('applyTemplateVariables throws when $__timeGroup is missing required args', () => {
    expect(() =>
      ds.applyTemplateVariables({ refId: 'A', rawSql: 'SELECT $__timeGroup(created_at) FROM t' }, {})
    ).toThrow('macro $__timeGroup needs time column and interval');
  });

  it('applyTemplateVariables interpolates valid macros without throwing', () => {
    const target: SQLQuery = { refId: 'A', rawSql: 'SELECT * FROM t WHERE $__timeFilter(created_at)' };

    expect(ds.applyTemplateVariables(target, {})).toEqual({
      refId: 'A',
      datasource: ds.getRef(),
      rawSql: 'SELECT * FROM t WHERE $__timeFilter(created_at)',
      format: undefined,
    });
  });

  it('interpolateVariablesInQueries throws when a query has a leftover macro_error()', () => {
    expect(() =>
      ds.interpolateVariablesInQueries([{ refId: 'A', rawSql: 'SELECT macro_error() FROM t' }], {})
    ).toThrow('SQL macro interpolation failed');
  });

  it('query fails the data path when a target has a malformed SQL macro', async () => {
    const request = {
      app: CoreApp.Explore,
      targets: [{ refId: 'A', rawSql: 'SELECT * FROM t WHERE $__timeFilter()' }],
    } as DataQueryRequest<SQLQuery>;

    await expect(firstValueFrom(ds.query(request))).rejects.toThrow('macro $__timeFilter needs time column');
  });
});
