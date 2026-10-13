import { getBackendSrv } from '@grafana/runtime';

export interface FeatureToggle {
  name: string;
  description: string;
  stage: string;
  enabled: boolean;
}

const featureTogglesUrl = '/api/admin/feature-toggles';

export function getFeatureToggles(): Promise<FeatureToggle[]> {
  return getBackendSrv().get<FeatureToggle[]>(featureTogglesUrl);
}

export function updateFeatureToggle(name: string, enabled: boolean): Promise<FeatureToggle> {
  return getBackendSrv().put<FeatureToggle>(`${featureTogglesUrl}/${encodeURIComponent(name)}`, { enabled });
}
