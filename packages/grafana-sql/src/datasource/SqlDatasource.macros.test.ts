import { firstValueFrom, of } from 'rxjs';

import { CoreApp, type DataQueryRequest, type DataSourceInstanceSettings, LoadingState } from '@grafana/data';
import { DataSourceWithBackend, type TemplateSrv } from '@grafana/runtime';

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
    uid: 'mysql-uid',
    type: 'grafana-mysql-datasource',
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

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('query fails with the macro error when $__timeFilter has no time column', async () => {
    const request = {
      app: CoreApp.Dashboard,
      targets: [{ refId: 'A', rawSql: 'SELECT * FROM t WHERE $__timeFilter()' }],
    } as DataQueryRequest<SQLQuery>;

    await expect(firstValueFrom(ds.query(request))).rejects.toThrow(
      'missing time column argument for macro $__timeFilter'
    );
  });

  it('query fails with the macro error when $__timeGroup is missing its interval', async () => {
    const request = {
      app: CoreApp.Dashboard,
      targets: [{ refId: 'A', rawSql: 'SELECT $__timeGroup(created_at) FROM t' }],
    } as DataQueryRequest<SQLQuery>;

    await expect(firstValueFrom(ds.query(request))).rejects.toThrow(
      'macro $__timeGroup needs time column and interval'
    );
  });

  it('applyTemplateVariables throws when interpolation leaves an invalid macro', () => {
    expect(() =>
      ds.applyTemplateVariables({ refId: 'A', rawSql: 'SELECT $__timeGroup(created_at) FROM t' }, {})
    ).toThrow('macro $__timeGroup needs time column and interval');
  });

  it('applyTemplateVariables keeps a valid macro query', () => {
    const result = ds.applyTemplateVariables(
      { refId: 'A', rawSql: 'SELECT * FROM t WHERE $__timeFilter(created_at)' },
      {}
    );

    expect(result.rawSql).toBe('SELECT * FROM t WHERE $__timeFilter(created_at)');
    expect(result.refId).toBe('A');
    expect(result.format).toBeUndefined();
  });

  it('puts macro_error() from the executed query on the query response', async () => {
    jest.spyOn(DataSourceWithBackend.prototype, 'query').mockReturnValue(
      of({
        data: [
          {
            refId: 'A',
            fields: [],
            length: 0,
            meta: { executedQueryString: 'SELECT macro_error() FROM t' },
          },
        ],
      })
    );

    const response = await firstValueFrom(
      ds.query({
        app: CoreApp.Dashboard,
        targets: [{ refId: 'A', rawSql: 'SELECT * FROM t WHERE $__timeFilter(created_at)' }],
      } as DataQueryRequest<SQLQuery>)
    );

    expect(response.state).toBe(LoadingState.Error);
    expect(response.error?.message).toBe('SQL macro interpolation failed');
    expect(response.error?.refId).toBe('A');
  });

  it('returns a valid query response without adding an error', async () => {
    const backendResponse = {
      data: [
        {
          refId: 'A',
          fields: [],
          length: 0,
          meta: { executedQueryString: 'SELECT * FROM t WHERE created_at BETWEEN 1 AND 2' },
        },
      ],
    };
    jest.spyOn(DataSourceWithBackend.prototype, 'query').mockReturnValue(of(backendResponse));

    const response = await firstValueFrom(
      ds.query({
        app: CoreApp.Dashboard,
        targets: [{ refId: 'A', rawSql: 'SELECT * FROM t WHERE $__timeFilter(created_at)' }],
      } as DataQueryRequest<SQLQuery>)
    );

    expect(response).toBe(backendResponse);
    expect(response.error).toBeUndefined();
  });
});
