import { render, screen } from 'test/test-utils';
import userEvent from '@testing-library/user-event';

import { getBackendSrv, setBackendSrv } from '@grafana/runtime';
import { contextSrv } from 'app/core/services/context_srv';
import { AccessControlAction } from 'app/types/accessControl';

import { type LabsFeaturesResponse } from './api';
import LabsPage from './LabsPage';

const features: LabsFeaturesResponse = {
  features: [
    {
      name: 'dashboardScene',
      description: 'Enable scene-based dashboards',
      stage: 'preview',
      enabled: false,
    },
    {
      name: 'alertingCentralAlertHistory',
      description: 'Show central alert history',
      stage: 'experimental',
      enabled: true,
    },
  ],
};

const originalBackendSrv = getBackendSrv();
const mockGet = jest.fn();
const mockPut = jest.fn();

function renderPage() {
  return render(<LabsPage />, {
    preloadedState: {
      navIndex: {
        labs: { id: 'labs', text: 'Labs', url: '/labs' },
      },
    },
  });
}

describe('LabsPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPut.mockReset();
    mockGet.mockResolvedValue(features);
    mockPut.mockResolvedValue({ name: 'dashboardScene', enabled: true });
    setBackendSrv({
      ...originalBackendSrv,
      get: mockGet,
      put: mockPut,
    });
    jest.spyOn(contextSrv, 'hasPermission').mockImplementation((action) => {
      return (
        action === AccessControlAction.FeatureManagementRead || action === AccessControlAction.FeatureManagementWrite
      );
    });
  });

  afterEach(() => {
    setBackendSrv(originalBackendSrv);
    jest.restoreAllMocks();
  });

  it('lists feature flags with name, description, stage, and switch state', async () => {
    renderPage();

    expect(
      await screen.findByText(
        'Changes apply at runtime and are not written to configuration. A page reload may be required before frontend features pick up the new value.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('dashboardScene')).toBeInTheDocument();
    expect(screen.getByText('Enable scene-based dashboards')).toBeInTheDocument();
    expect(screen.getByText('preview')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Toggle dashboardScene' })).not.toBeChecked();
    expect(screen.getByRole('switch', { name: 'Toggle alertingCentralAlertHistory' })).toBeChecked();
    expect(mockGet).toHaveBeenCalledWith('/api/labs/features');
  });

  it('filters flags by search text', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('dashboardScene');
    await user.type(screen.getByPlaceholderText('Search feature flags'), 'central alert');

    expect(screen.getByText('alertingCentralAlertHistory')).toBeInTheDocument();
    expect(screen.queryByText('dashboardScene')).not.toBeInTheDocument();
  });

  it('shows a success message with a reload button after a successful toggle', async () => {
    const user = userEvent.setup();
    renderPage();

    const toggle = await screen.findByRole('switch', { name: 'Toggle dashboardScene' });
    await user.click(toggle);

    expect(mockPut).toHaveBeenCalledWith('/api/labs/features/dashboardScene', { enabled: true });
    expect(await screen.findByText('dashboardScene updated')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Toggle dashboardScene' })).toBeChecked();
  });

  it('disables switches when the user cannot write feature flags', async () => {
    jest.spyOn(contextSrv, 'hasPermission').mockImplementation((action) => {
      return action === AccessControlAction.FeatureManagementRead;
    });
    renderPage();

    expect(await screen.findByRole('switch', { name: 'Toggle dashboardScene' })).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Toggle alertingCentralAlertHistory' })).toBeDisabled();
  });
});
