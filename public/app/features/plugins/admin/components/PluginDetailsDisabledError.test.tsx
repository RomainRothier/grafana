import { render, screen } from 'test/test-utils';

import { getCatalogPluginMock } from '../mocks/mockHelpers';

import { PluginDetailsDisabledError } from './PluginDetailsDisabledError';

describe('PluginDetailsDisabledError', () => {
  it('renders unknown-reason copy on the default disabled-error branch', () => {
    render(<PluginDetailsDisabledError plugin={getCatalogPluginMock({ isDisabled: true, error: undefined })} />);

    expect(screen.getByText(/due to an unknown reason/)).toBeInTheDocument();
    expect(screen.queryByText(/unkown/)).not.toBeInTheDocument();
  });
});
