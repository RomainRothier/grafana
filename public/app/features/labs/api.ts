import { getBackendSrv } from '@grafana/runtime';

export interface LabsFeature {
  name: string;
  description: string;
  stage: string;
  enabled: boolean;
}

export interface LabsFeaturesResponse {
  features: LabsFeature[];
}

export function getLabsFeatures() {
  return getBackendSrv().get<LabsFeaturesResponse>('/api/labs/features');
}

export function setLabsFeatureEnabled(name: string, enabled: boolean) {
  return getBackendSrv().put<LabsFeature>(`/api/labs/features/${encodeURIComponent(name)}`, { enabled });
}
