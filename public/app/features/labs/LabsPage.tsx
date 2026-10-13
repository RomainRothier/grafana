import { useCallback, useEffect, useMemo, useState } from 'react';

import { t, Trans } from '@grafana/i18n';
import {
  Alert,
  Button,
  type CellProps,
  type Column,
  FilterInput,
  InteractiveTable,
  LoadingPlaceholder,
  Stack,
  Switch,
  Text,
} from '@grafana/ui';
import { Page } from 'app/core/components/Page/Page';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { type FeatureToggle, getFeatureToggles, updateFeatureToggle } from './api';

interface ToggleSuccess {
  name: string;
  enabled: boolean;
}

type ToggleCell = CellProps<FeatureToggle, FeatureToggle['name']>;

export function LabsPage() {
  const canWrite = contextSrv.hasPermission(AccessControlAction.FeatureTogglesWrite);
  const [toggles, setToggles] = useState<FeatureToggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingName, setPendingName] = useState<string>();
  const [success, setSuccess] = useState<ToggleSuccess>();
  const [saveError, setSaveError] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    getFeatureToggles()
      .then((items) => {
        if (!cancelled) {
          setToggles(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return toggles;
    }
    return toggles.filter((toggle) =>
      [toggle.name, toggle.description, toggle.stage].some((value) => value.toLowerCase().includes(needle))
    );
  }, [query, toggles]);

  const onToggle = useCallback(async (toggle: FeatureToggle, enabled: boolean) => {
    setPendingName(toggle.name);
    setSaveError(undefined);
    try {
      const updated = await updateFeatureToggle(toggle.name, enabled);
      setToggles((current) => current.map((item) => (item.name === updated.name ? updated : item)));
      setSuccess({ name: updated.name, enabled: updated.enabled });
    } catch {
      setSuccess(undefined);
      setSaveError(t('labs.feature-toggles.save-error', 'Failed to update {{name}}.', { name: toggle.name }));
    } finally {
      setPendingName(undefined);
    }
  }, []);

  const columns: Array<Column<FeatureToggle>> = useMemo(
    () => [
      {
        id: 'name',
        header: t('labs.feature-toggles.column-name', 'Name'),
        sortType: 'string',
      },
      {
        id: 'description',
        header: t('labs.feature-toggles.column-description', 'Description'),
        sortType: 'string',
      },
      {
        id: 'stage',
        header: t('labs.feature-toggles.column-stage', 'Stage'),
        sortType: 'string',
      },
      {
        id: 'enabled',
        header: t('labs.feature-toggles.column-enabled', 'Enabled'),
        disableGrow: true,
        cell: ({ row }: ToggleCell) => {
          const toggle = row.original;
          return (
            <Switch
              value={toggle.enabled}
              disabled={!canWrite || pendingName === toggle.name}
              label={toggle.name}
              aria-label={toggle.name}
              onChange={(event) => {
                void onToggle(toggle, event.currentTarget.checked);
              }}
            />
          );
        },
      },
    ],
    [canWrite, onToggle, pendingName]
  );

  const successState = success?.enabled
    ? t('labs.feature-toggles.state-enabled', 'enabled')
    : t('labs.feature-toggles.state-disabled', 'disabled');

  return (
    <Page
      navId="grafana-labs"
      pageNav={{
        text: t('labs.page.title', 'Grafana Labs'),
        subTitle: t('labs.page.subtitle', 'Toggle feature flags for this running Grafana process'),
        id: 'grafana-labs',
      }}
    >
      <Page.Contents>
        <Stack direction="column" gap={2}>
          <Alert severity="info" title={t('labs.feature-toggles.runtime-title', 'Runtime only')}>
            <Trans i18nKey="labs.feature-toggles.runtime-notice">
              Changes are runtime-only and may need a page reload.
            </Trans>
          </Alert>

          {success && (
            <Alert severity="success" title={t('labs.feature-toggles.success-title', 'Feature toggle updated')}>
              <Stack direction="column" gap={1} alignItems="flex-start">
                <Text>
                  {t(
                    'labs.feature-toggles.success',
                    '{{name}} is now {{state}}. Reload the page to apply the change in the UI.',
                    { name: success.name, state: successState }
                  )}
                </Text>
                <Button variant="secondary" icon="repeat" onClick={() => window.location.reload()}>
                  <Trans i18nKey="labs.feature-toggles.reload">Reload</Trans>
                </Button>
              </Stack>
            </Alert>
          )}

          {saveError && (
            <Alert severity="error" title={t('labs.feature-toggles.save-error-title', 'Update failed')}>
              {saveError}
            </Alert>
          )}

          {loadError && (
            <Alert severity="error" title={t('labs.feature-toggles.load-error-title', 'Could not load feature flags')}>
              <Trans i18nKey="labs.feature-toggles.load-error">Failed to load feature toggles.</Trans>
            </Alert>
          )}

          <FilterInput
            placeholder={t('labs.feature-toggles.search-placeholder', 'Search feature flags')}
            aria-label={t('labs.feature-toggles.search-label', 'Search feature flags')}
            value={query}
            onChange={setQuery}
            escapeRegex={false}
          />

          {loading ? (
            <LoadingPlaceholder text={t('labs.feature-toggles.loading', 'Loading feature flags')} />
          ) : (
            <InteractiveTable columns={columns} data={filtered} getRowId={(toggle) => toggle.name} />
          )}

          {!loading && !loadError && filtered.length === 0 && (
            <Text>
              <Trans i18nKey="labs.feature-toggles.no-matches">No feature flags match your search.</Trans>
            </Text>
          )}
        </Stack>
      </Page.Contents>
    </Page>
  );
}

export default LabsPage;
