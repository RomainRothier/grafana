import { render, screen } from '@testing-library/react';

import { type CatalogPlugin } from '../types';

import { PluginDetailsDisabledError } from './PluginDetailsDisabledError';

describe('PluginDetailsDisabledError', () => {
  it('renders the unknown-reason description when the plugin is disabled without a known error code', () => {
    const plugin = { id: 'test-plugin', isDisabled: true } as CatalogPlugin;

    render(<PluginDetailsDisabledError plugin={plugin} />);

    expect(
      screen.getByText(
        'We failed to run this plugin due to an unknown reason and have therefore disabled it. We recommend you to reinstall the plugin to make sure you are running a working version of this plugin.'
      )
    ).toBeInTheDocument();
  });
});
