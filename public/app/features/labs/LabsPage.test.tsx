import { render, screen } from 'test/test-utils';

import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { LabsPage } from './LabsPage';

const mockGet = jest.fn();
const mockPut = jest.fn();

jest.mock('@grafana/runtime', () => ({
  ...jest.requireActual('@grafana/runtime'),
  getBackendSrv: () => ({
    get: mockGet,
    put: mockPut,
  }),
}));

const flags = [
  {
    name: 'panelTitleSearch',
    description: 'Search for dashboards using panel title',
    stage: 'preview',
    enabled: false,
  },
  {
    name: 'cloudWatchCrossAccountQuerying',
    description: 'Enables cross-account querying in CloudWatch datasources',
    stage: 'GA',
    enabled: true,
  },
];

describe('LabsPage', () => {
  const previousPermissions = contextSrv.user.permissions;

  beforeEach(() => {
    mockGet.mockResolvedValue(flags);
    mockPut.mockReset();
    contextSrv.user.permissions = {
      [AccessControlAction.FeatureTogglesRead]: true,
      [AccessControlAction.FeatureTogglesWrite]: true,
    };
  });

  afterEach(() => {
    contextSrv.user.permissions = previousPermissions;
  });

  it('lists each flag with its description and stage, and notes that changes are runtime-only', async () => {
    render(<LabsPage />);

    expect(await screen.findByText('panelTitleSearch')).toBeInTheDocument();
    expect(screen.getByText('Search for dashboards using panel title')).toBeInTheDocument();
    expect(screen.getByText('preview')).toBeInTheDocument();
    expect(screen.getByText('cloudWatchCrossAccountQuerying')).toBeInTheDocument();
    expect(screen.getByText('GA')).toBeInTheDocument();
    expect(screen.getByText('Changes are runtime-only and may need a page reload.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'panelTitleSearch' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'cloudWatchCrossAccountQuerying' })).toBeChecked();
    expect(mockGet).toHaveBeenCalledWith('/api/admin/feature-toggles');
  });

  it('filters the table by name, description, or stage', async () => {
    const { user } = render(<LabsPage />);

    expect(await screen.findByText('Search for dashboards using panel title')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Search feature flags' }), 'GA');

    expect(screen.getByText('Enables cross-account querying in CloudWatch datasources')).toBeInTheDocument();
    expect(screen.queryByText('Search for dashboards using panel title')).not.toBeInTheDocument();
  });

  it('enables a flag and shows a reload action after a successful update', async () => {
    mockPut.mockImplementation(async (_url: string, body: { enabled: boolean }) => ({
      name: 'panelTitleSearch',
      description: 'Search for dashboards using panel title',
      stage: 'preview',
      enabled: body.enabled,
    }));
    const { user } = render(<LabsPage />);

    await user.click(await screen.findByRole('switch', { name: 'panelTitleSearch' }));

    expect(mockPut).toHaveBeenCalledWith('/api/admin/feature-toggles/panelTitleSearch', { enabled: true });
    expect(await screen.findByRole('switch', { name: 'panelTitleSearch' })).toBeChecked();
    expect(
      screen.getByText('panelTitleSearch is now enabled. Reload the page to apply the change in the UI.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('keeps the switch off and shows an error when the update fails', async () => {
    mockPut.mockRejectedValue(new Error('nope'));
    const { user } = render(<LabsPage />);

    const toggle = await screen.findByRole('switch', { name: 'panelTitleSearch' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);

    expect(await screen.findByText('Failed to update panelTitleSearch.')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'panelTitleSearch' })).not.toBeChecked();
    expect(mockPut).toHaveBeenCalledWith('/api/admin/feature-toggles/panelTitleSearch', { enabled: true });
  });

  it('disables switches when the user cannot write feature toggles', async () => {
    contextSrv.user.permissions = { [AccessControlAction.FeatureTogglesRead]: true };
    const { user } = render(<LabsPage />);

    const toggle = await screen.findByRole('switch', { name: 'panelTitleSearch' });
    expect(toggle).toBeDisabled();
    await user.click(toggle);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('shows an error when feature toggles cannot be loaded', async () => {
    mockGet.mockRejectedValue(new Error('offline'));
    render(<LabsPage />);

    expect(await screen.findByText('Failed to load feature toggles.')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: 'panelTitleSearch' })).not.toBeInTheDocument();
  });
});
