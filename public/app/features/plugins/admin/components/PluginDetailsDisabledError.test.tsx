import { render, screen } from '@testing-library/react';

import { getCatalogPluginMock } from '../mocks/mockHelpers';

import { PluginDetailsDisabledError } from './PluginDetailsDisabledError';

describe('PluginDetailsDisabledError', () => {
  it('says the plugin was disabled due to an unknown reason when no error code is set', () => {
    render(<PluginDetailsDisabledError plugin={getCatalogPluginMock({ isDisabled: true })} />);

    expect(
      screen.getByText(
        'We failed to run this plugin due to an unknown reason and have therefore disabled it. We recommend you to reinstall the plugin to make sure you are running a working version of this plugin.'
      )
    ).toBeInTheDocument();
  });
});
