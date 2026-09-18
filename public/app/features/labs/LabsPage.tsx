import { css } from '@emotion/css';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type GrafanaTheme2 } from '@grafana/data';
import { t, Trans } from '@grafana/i18n';
import {
  Alert,
  Button,
  type Column,
  EmptyState,
  FilterInput,
  InteractiveTable,
  Stack,
  Switch,
  useStyles2,
} from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { getLabsFeatures, setLabsFeatureEnabled, type LabsFeature } from './api';

export default function LabsPage() {
  const styles = useStyles2(getStyles);
  const canWrite = contextSrv.hasPermission(AccessControlAction.FeatureManagementWrite);

  const [features, setFeatures] = useState<LabsFeature[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | undefined>();
  const [toggleError, setToggleError] = useState<string | undefined>();
  const [updatedName, setUpdatedName] = useState<string | undefined>();
  const [togglingName, setTogglingName] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    getLabsFeatures()
      .then((response) => {
        if (!cancelled) {
          setFeatures(response.features);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(t('labs.load-error', 'Failed to load feature flags.'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const onToggle = useCallback(async (name: string, enabled: boolean) => {
    setTogglingName(name);
    setToggleError(undefined);
    try {
      await setLabsFeatureEnabled(name, enabled);
      setFeatures((current) => current.map((feature) => (feature.name === name ? { ...feature, enabled } : feature)));
      setUpdatedName(name);
    } catch {
      setToggleError(t('labs.toggle-error', 'Failed to update {{name}}.', { name }));
    } finally {
      setTogglingName(undefined);
    }
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return features;
    }

    return features.filter(
      (feature) =>
        feature.name.toLowerCase().includes(needle) ||
        feature.description.toLowerCase().includes(needle) ||
        feature.stage.toLowerCase().includes(needle)
    );
  }, [features, query]);

  const columns: Array<Column<LabsFeature>> = useMemo(
    () => [
      {
        id: 'name',
        header: t('labs.column.name', 'Name'),
        sortType: 'alphanumeric',
      },
      {
        id: 'description',
        header: t('labs.column.description', 'Description'),
      },
      {
        id: 'stage',
        header: t('labs.column.stage', 'Stage'),
        disableGrow: true,
      },
      {
        id: 'enabled',
        header: t('labs.column.enabled', 'Enabled'),
        disableGrow: true,
        cell: ({ row: { original } }) => (
          <Switch
            value={original.enabled}
            disabled={!canWrite || togglingName === original.name}
            label={t('labs.toggle-label', 'Toggle {{name}}', { name: original.name })}
            onChange={(event) => {
              void onToggle(original.name, event.currentTarget.checked);
            }}
          />
        ),
      },
    ],
    [canWrite, onToggle, togglingName]
  );

  return (
    <Page navId="labs">
      <Page.Contents isLoading={isLoading}>
        <Stack direction="column" gap={2}>
          <Alert severity="info" title={t('labs.runtime-note-title', 'Runtime only')}>
            <Trans i18nKey="labs.runtime-note">
              Changes apply at runtime and are not written to configuration. A page reload may be required before
              frontend features pick up the new value.
            </Trans>
          </Alert>

          {loadError && (
            <Alert severity="error" title={t('labs.load-error-title', 'Could not load feature flags')}>
              {loadError}
            </Alert>
          )}

          {toggleError && (
            <Alert severity="error" title={t('labs.toggle-error-title', 'Could not update feature flag')}>
              {toggleError}
            </Alert>
          )}

          {updatedName && (
            <Alert
              severity="success"
              title={t('labs.toggle-success-title', '{{name}} updated', { name: updatedName })}
            >
              <Stack direction="column" gap={1} alignItems="flex-start">
                <Trans i18nKey="labs.toggle-success-body">Reload the page to apply frontend changes.</Trans>
                <Button onClick={() => window.location.reload()}>
                  <Trans i18nKey="labs.reload-button">Reload</Trans>
                </Button>
              </Stack>
            </Alert>
          )}

          <FilterInput
            className={styles.search}
            placeholder={t('labs.search-placeholder', 'Search feature flags')}
            value={query}
            onChange={setQuery}
            escapeRegex={false}
          />

          {!loadError && filtered.length === 0 ? (
            <EmptyState variant="not-found" message={t('labs.empty', 'No feature flags found')} />
          ) : (
            <InteractiveTable columns={columns} data={filtered} getRowId={(feature) => feature.name} />
          )}
        </Stack>
      </Page.Contents>
    </Page>
  );
}

const getStyles = (theme: GrafanaTheme2) => ({
  search: css({
    maxWidth: theme.spacing(48),
  }),
});
